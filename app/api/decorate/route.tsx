import path from "node:path";
import { promises as fs } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PrismaClient } from "../../generated/prisma-client/client";
import { decrypt } from "@/app/lib/session";

const prisma = new PrismaClient();

// même logique que ton API images
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const GALLERIES_FOLDER = process.env.GALLERIES_FOLDER
  ? path.normalize(
      path.isAbsolute(process.env.GALLERIES_FOLDER)
        ? process.env.GALLERIES_FOLDER
        : path.join(process.cwd(), process.env.GALLERIES_FOLDER)
    )
  : PUBLIC_ROOT;
const SIGNING_SECRET =
  process.env.IMAGE_SIGNATURE_SECRET ?? process.env.SESSION_SECRET;

if (!SIGNING_SECRET) {
  throw new Error("IMAGE_SIGNATURE_SECRET or SESSION_SECRET must be defined");
}

const resolveFolderPath = (storedPath: string) => {
  const normalized = storedPath.trim();
  if (!normalized) {
    return null;
  }
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.normalize(path.join(GALLERIES_FOLDER, normalized));
};

const signImageAccess = (galleryId: number, fileName: string) => {
  const hmac = createHmac("sha256", SIGNING_SECRET);
  hmac.update(`${galleryId}:${fileName}`);
  return hmac.digest("base64url");
};

const verifyImageSignature = (
  galleryId: number,
  fileName: string,
  signature: string | null
) => {
  if (!signature) {
    return false;
  }
  try {
    const expected = signImageAccess(galleryId, fileName);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
};

const getMimeType = (filePath: string) => {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".tiff":
    case ".tif":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
};

const assertFileWithinFolder = (folderPath: string, fileName: string) => {
  if (!fileName || fileName.includes("..") || /[\\/]/.test(fileName)) {
    return null;
  }
  const absolutePath = path.normalize(path.join(folderPath, fileName));
  const folderWithSep = folderPath.endsWith(path.sep)
    ? folderPath
    : folderPath + path.sep;
  if (!absolutePath.toLowerCase().startsWith(folderWithSep.toLowerCase())) {
    return null;
  }
  return absolutePath;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const galleryParam =
      url.searchParams.get("galleryId") ?? url.searchParams.get("gallery");
    const fileName = url.searchParams.get("file");
    const signature = url.searchParams.get("sig");

    if (!galleryParam) {
      return NextResponse.json(
        { message: "galleryId query parameter is required" },
        { status: 400 }
      );
    }
    if (!fileName) {
      return NextResponse.json(
        { message: "file query parameter is required" },
        { status: 400 }
      );
    }

    const galleryId = Number(galleryParam);
    if (!Number.isFinite(galleryId) || galleryId <= 0) {
      return NextResponse.json(
        { message: "galleryId must be a positive number" },
        { status: 400 }
      );
    }

    // Auth = même logique que /api/images
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const payload = sessionToken ? await decrypt(sessionToken) : null;
    const sessionGalleryId = payload?.GalleryId
      ? Number(payload.GalleryId)
      : null;

    const hasSessionAccess =
      sessionGalleryId !== null && sessionGalleryId === galleryId;
    const hasSignatureAccess = verifyImageSignature(
      galleryId,
      fileName,
      signature
    );

    if (!hasSessionAccess && !hasSignatureAccess) {
      return NextResponse.json(
        { message: "Forbidden for this gallery" },
        { status: 403 }
      );
    }

    const galleryRecord = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: { id: true, photosPath: true },
    });

    if (!galleryRecord) {
      return NextResponse.json(
        { message: "Gallery not found", galleryId },
        { status: 404 }
      );
    }

    if (!galleryRecord.photosPath) {
      return NextResponse.json(
        { message: "Gallery has no photo directory configured" },
        { status: 422 }
      );
    }

    const folderPath = resolveFolderPath(galleryRecord.photosPath);
    if (!folderPath) {
      return NextResponse.json(
        { message: "Stored path is invalid" },
        { status: 422 }
      );
    }

    const normalizedFolderPath = path.normalize(folderPath);
    const folderStat = await fs.stat(normalizedFolderPath).catch(() => null);
    if (!folderStat || !folderStat.isDirectory()) {
      return NextResponse.json(
        {
          message: "Gallery directory does not exist",
          path: galleryRecord.photosPath,
        },
        { status: 404 }
      );
    }

    const absoluteFile = assertFileWithinFolder(normalizedFolderPath, fileName);
    if (!absoluteFile) {
      return NextResponse.json(
        { message: "Invalid file path" },
        { status: 400 }
      );
    }

    const fileStat = await fs.stat(absoluteFile).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    const buffer = await fs.readFile(absoluteFile);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(absoluteFile),
        "Cache-Control": "public, max-age=60",
      },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("decorate error", errMsg);
    return NextResponse.json(
      { message: "Unable to load image", error: errMsg },
      { status: 500 }
    );
  }
}
