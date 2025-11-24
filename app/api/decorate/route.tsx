import path from "node:path";
import { promises as fs } from "node:fs";
import { createHmac, timingSafeEqual } from "node:crypto";

import sharp from "sharp";
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

// chemin du frame 9-slice (mets ton PNG ici)
const FRAME_PATH = path.join(
  process.cwd(),
  "public",
  "frames",
  "frame_9slice.png"
);

// DOIVENT matcher ce que tu as fait dans Figma
const FRAME_BORDERS = {
  top: 75,
  right: 131,
  bottom: 75,
  left: 75,
};

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
      select: { id: true, photosPath: true, date: true },
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

    // --- Décoration 9-slice ---

    // 1) Taille de l'image de base
    const baseMeta = await sharp(absoluteFile).metadata();
    if (!baseMeta.width || !baseMeta.height) {
      return NextResponse.json(
        { message: "Invalid base image" },
        { status: 500 }
      );
    }
    const targetWidth = baseMeta.width;
    const targetHeight = baseMeta.height;

    // 2) Charger le frame
    const frameBuffer = await fs.readFile(FRAME_PATH);
    const frameMeta = await sharp(frameBuffer).metadata();
    if (!frameMeta.width || !frameMeta.height) {
      return NextResponse.json(
        { message: "Invalid frame image" },
        { status: 500 }
      );
    }

    const W0 = frameMeta.width;
    const H0 = frameMeta.height;

    const { top, right, bottom, left } = FRAME_BORDERS;

    const centerSrcWidth = W0 - left - right;
    const centerSrcHeight = H0 - top - bottom;

    const centerDestWidth = targetWidth - left - right;
    const centerDestHeight = targetHeight - top - bottom;

    if (
      centerSrcWidth <= 0 ||
      centerSrcHeight <= 0 ||
      centerDestWidth <= 0 ||
      centerDestHeight <= 0
    ) {
      return NextResponse.json(
        { message: "Invalid borders vs image size" },
        { status: 500 }
      );
    }

    type SliceDef = {
      srcLeft: number;
      srcTop: number;
      srcWidth: number;
      srcHeight: number;
      destLeft: number;
      destTop: number;
      destWidth: number;
      destHeight: number;
    };

    const slices: SliceDef[] = [
      // TL
      {
        srcLeft: 0,
        srcTop: 0,
        srcWidth: left,
        srcHeight: top,
        destLeft: 0,
        destTop: 0,
        destWidth: left,
        destHeight: top,
      },
      // T
      {
        srcLeft: left,
        srcTop: 0,
        srcWidth: centerSrcWidth,
        srcHeight: top,
        destLeft: left,
        destTop: 0,
        destWidth: centerDestWidth,
        destHeight: top,
      },
      // TR
      {
        srcLeft: W0 - right,
        srcTop: 0,
        srcWidth: right,
        srcHeight: top,
        destLeft: targetWidth - right,
        destTop: 0,
        destWidth: right,
        destHeight: top,
      },
      // L
      {
        srcLeft: 0,
        srcTop: top,
        srcWidth: left,
        srcHeight: centerSrcHeight,
        destLeft: 0,
        destTop: top,
        destWidth: left,
        destHeight: centerDestHeight,
      },
      // R
      {
        srcLeft: W0 - right,
        srcTop: top,
        srcWidth: right,
        srcHeight: centerSrcHeight,
        destLeft: targetWidth - right,
        destTop: top,
        destWidth: right,
        destHeight: centerDestHeight,
      },
      // BL
      {
        srcLeft: 0,
        srcTop: H0 - bottom,
        srcWidth: left,
        srcHeight: bottom,
        destLeft: 0,
        destTop: targetHeight - bottom,
        destWidth: left,
        destHeight: bottom,
      },
      // B
      {
        srcLeft: left,
        srcTop: H0 - bottom,
        srcWidth: centerSrcWidth,
        srcHeight: bottom,
        destLeft: left,
        destTop: targetHeight - bottom,
        destWidth: centerDestWidth,
        destHeight: bottom,
      },
      // BR
      {
        srcLeft: W0 - right,
        srcTop: H0 - bottom,
        srcWidth: right,
        srcHeight: bottom,
        destLeft: targetWidth - right,
        destTop: targetHeight - bottom,
        destWidth: right,
        destHeight: bottom,
      },
    ];

    const overlays = await Promise.all(
      slices.map(async (s) => {
        const sliceBuf = await sharp(frameBuffer)
          .extract({
            left: s.srcLeft,
            top: s.srcTop,
            width: s.srcWidth,
            height: s.srcHeight,
          })
          .resize(s.destWidth, s.destHeight)
          .toBuffer();

        return {
          input: sliceBuf,
          left: s.destLeft,
          top: s.destTop,
        } as sharp.OverlayOptions;
      })
    );

    // Date dynamique (ajuste x/y selon ton design)
    const date = (galleryRecord.date ?? "").toString().trim();

    const dateSvg = `
      <svg width="${targetWidth}" height="${targetHeight}">
        <style>
          .date {
            fill: #ffffff;
            opacity: 0.4;
            font-size: 24px;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
        </style>
        <text
          x="${targetWidth - 20}"
          y="${targetHeight - 10}"
          text-anchor="end"
          class="date"
        >
          ${date}
        </text>
      </svg>
    `;
    const dateLayer = Buffer.from(dateSvg);

    // Image de base
    const baseBuffer = await sharp(absoluteFile)
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "centre",
      })
      .toBuffer();

    const finalBuffer = await sharp(baseBuffer)
      .composite([...overlays, { input: dateLayer, blend: "over" }])
      .png()
      .toBuffer();

    return new NextResponse(finalBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("decorate error", errMsg);
    return NextResponse.json(
      { message: "Unable to decorate image", error: errMsg },
      { status: 500 }
    );
  }
}
