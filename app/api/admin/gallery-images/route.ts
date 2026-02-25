import path from "path";
import { createHmac } from "node:crypto";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

import imageSize from "image-size";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";
import { getAdminSession } from "@/app/lib/admin-auth";
import {
  GALLERIES_BASE,
  pathExists,
  resolveGalleryFolder,
  sanitizeSegment,
} from "@/app/lib/media-manager";

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
      largeURL: buildImageUrl(galleryId, file, signature),
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

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const galleryIdValue = formData.get("galleryId");
  if (typeof galleryIdValue !== "string" || !galleryIdValue.trim()) {
    return NextResponse.json(
      { message: "Le paramètre galleryId est requis." },
      { status: 400 }
    );
  }

  const galleryId = Number(galleryIdValue);
  if (!Number.isInteger(galleryId) || galleryId <= 0) {
    return NextResponse.json(
      { message: "Identifiant de galerie invalide." },
      { status: 400 }
    );
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return NextResponse.json(
      { message: "Ajoutez au moins une image." },
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

  await fs.mkdir(GALLERIES_BASE, { recursive: true });

  let storedPath = galleryRecord.photosPath?.trim() ?? "";
  if (!storedPath) {
    const baseSegment =
      sanitizeSegment(`gallery-${galleryRecord.id}`) ||
      `gallery-${galleryRecord.id}`;
    let candidate = baseSegment;
    let suffix = 1;
    while (await pathExists(path.join(GALLERIES_BASE, candidate))) {
      candidate = `${baseSegment}-${suffix++}`;
    }
    storedPath = candidate;
    await prisma.gallery.update({
      where: { id: galleryRecord.id },
      data: { photosPath: storedPath },
    });
  }

  const absoluteFolder = resolveGalleryFolder(storedPath);
  if (!absoluteFolder) {
    return NextResponse.json(
      { message: "Impossible de déterminer le dossier cible." },
      { status: 500 }
    );
  }

  await fs.mkdir(absoluteFolder, { recursive: true });

  const saved: string[] = [];
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (path.extname(file.name) || ".bin").toLowerCase();
      const safeBase =
        sanitizeSegment(path.parse(file.name).name) ||
        `image-${randomUUID().slice(0, 8)}`;
      let candidateName = `${safeBase}${ext}`;
      let duplicate = 1;
      while (await pathExists(path.join(absoluteFolder, candidateName))) {
        candidateName = `${safeBase}-${duplicate++}${ext}`;
      }
      await fs.writeFile(path.join(absoluteFolder, candidateName), buffer);
      saved.push(candidateName);
    } catch (error) {
      console.error("gallery-images POST", error);
    }
  }

  if (!saved.length) {
    return NextResponse.json(
      { message: "Aucune image enregistrée." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: `${saved.length} image(s) ajoutée(s) à ${galleryRecord.title}.`,
      saved,
    },
    { status: 200 }
  );
}
