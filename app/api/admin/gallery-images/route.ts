import path from "path";
import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";

import imageSize from "image-size";
import { NextRequest, NextResponse } from "next/server";

import { PrismaClient } from "@/app/generated/prisma-client/client";
import { getAdminSession } from "@/app/lib/admin-auth";
import { pathExists, resolveGalleryFolder } from "@/app/lib/media-manager";

const prisma = new PrismaClient();
const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|bmp|tiff)$/i;
const SIGNING_SECRET =
  process.env.IMAGE_SIGNATURE_SECRET ??
  process.env.SESSION_SECRET ??
  "dev-gallery-signature";

if (!process.env.IMAGE_SIGNATURE_SECRET && !process.env.SESSION_SECRET) {
  console.warn(
    "Aucun secret de signature n'est défini. Un secret de développement est utilisé pour les URLs d'images."
  );
}

const signImageAccess = (galleryId: number, fileName: string) => {
  const hmac = createHmac("sha256", SIGNING_SECRET);
  hmac.update(`${galleryId}:${fileName}`);
  return hmac.digest("base64url");
};

const buildImageUrl = (
  galleryId: number,
  fileName: string,
  signature: string
) =>
  `/api/images?galleryId=${galleryId}&file=${encodeURIComponent(
    fileName
  )}&sig=${signature}`;

const buildDecoratedImageUrl = (
  galleryId: number,
  fileName: string,
  signature: string
) =>
  `/api/decorate?galleryId=${galleryId}&file=${encodeURIComponent(
    fileName
  )}&sig=${signature}`;

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

const listGalleryImages = async (galleryId: number, folderPath: string) => {
  const files = await fs.readdir(folderPath);
  const images = [] as Array<{
    file: string;
    width: number;
    height: number;
    size: number;
    thumbnailURL: string;
    largeURL: string;
  }>;

  for (const file of files) {
    if (!IMAGE_EXT.test(file)) {
      continue;
    }

    const absoluteFile = path.join(folderPath, file);
    const stat = await fs.stat(absoluteFile).catch(() => null);
    if (!stat || !stat.isFile()) {
      continue;
    }

    let dimensions;
    try {
      const fileBuffer = await fs.readFile(absoluteFile);
      dimensions = imageSize(fileBuffer);
    } catch (error) {
      console.error("listGalleryImages", error);
      continue;
    }

    const width = dimensions.width ?? 0;
    const height = dimensions.height ?? 0;
    if (!width || !height) {
      continue;
    }

    const signature = signImageAccess(galleryId, file);
    images.push({
      file,
      width,
      height,
      size: stat.size,
      thumbnailURL: buildImageUrl(galleryId, file, signature),
      largeURL: buildDecoratedImageUrl(galleryId, file, signature),
    });
  }

  return images.sort((a, b) => a.file.localeCompare(b.file));
};

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }

  const url = new URL(request.url);
  const galleryParam = url.searchParams.get("galleryId");

  if (!galleryParam) {
    return NextResponse.json(
      { message: "Le paramètre galleryId est requis." },
      { status: 400 }
    );
  }

  const galleryId = Number(galleryParam);
  if (!Number.isInteger(galleryId) || galleryId <= 0) {
    return NextResponse.json(
      { message: "Identifiant de galerie invalide." },
      { status: 400 }
    );
  }

  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, title: true, photosPath: true },
  });

  if (!galleryRecord) {
    return NextResponse.json(
      { message: "Galerie introuvable." },
      { status: 404 }
    );
  }

  const folderPath = resolveGalleryFolder(galleryRecord.photosPath);
  if (!folderPath) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const normalizedFolderPath = path.normalize(folderPath);
  const folderStat = await fs.stat(normalizedFolderPath).catch(() => null);
  if (!folderStat || !folderStat.isDirectory()) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  const images = await listGalleryImages(
    galleryRecord.id,
    normalizedFolderPath
  );

  return NextResponse.json(
    {
      message: "Images récupérées.",
      data: images,
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }

  let payload: { galleryId?: unknown; file?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const galleryId = Number(payload.galleryId);
  if (!Number.isInteger(galleryId) || galleryId <= 0) {
    return NextResponse.json(
      { message: "Identifiant de galerie invalide." },
      { status: 400 }
    );
  }

  const fileName = typeof payload.file === "string" ? payload.file.trim() : "";
  if (!fileName) {
    return NextResponse.json(
      { message: "Nom de fichier requis." },
      { status: 400 }
    );
  }

  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, title: true, photosPath: true },
  });

  if (!galleryRecord) {
    return NextResponse.json(
      { message: "Galerie introuvable." },
      { status: 404 }
    );
  }

  const folderPath = resolveGalleryFolder(galleryRecord.photosPath);
  if (!folderPath) {
    return NextResponse.json(
      { message: "La galerie ne possède pas de dossier configuré." },
      { status: 422 }
    );
  }

  const normalizedFolderPath = path.normalize(folderPath);
  if (!(await pathExists(normalizedFolderPath))) {
    return NextResponse.json(
      { message: "Le dossier de la galerie est introuvable." },
      { status: 404 }
    );
  }

  const targetFile = assertFileWithinFolder(normalizedFolderPath, fileName);
  if (!targetFile) {
    return NextResponse.json(
      { message: "Nom de fichier invalide." },
      { status: 400 }
    );
  }

  const stat = await fs.stat(targetFile).catch(() => null);
  if (!stat || !stat.isFile()) {
    return NextResponse.json(
      { message: "Fichier introuvable." },
      { status: 404 }
    );
  }

  await fs.unlink(targetFile);

  return NextResponse.json(
    {
      message: `Image "${fileName}" supprimée.`,
    },
    { status: 200 }
  );
}
