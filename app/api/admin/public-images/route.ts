import path from "path";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import { randomUUID } from "node:crypto";

import imageSize from "image-size";
import { NextRequest, NextResponse } from "next/server";

import { getAdminSession } from "@/app/lib/admin-auth";
import {
  DEFAULT_PUBLIC_UPLOAD_DIR,
  PUBLIC_ROOT,
  pathExists,
  sanitizeSegment,
  sanitizeNestedRelativePath,
} from "@/app/lib/media-manager";

const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|bmp|tiff)$/i;
const NORMALIZED_PUBLIC_ROOT = path.normalize(PUBLIC_ROOT);
const PUBLIC_ROOT_WITH_SEP = NORMALIZED_PUBLIC_ROOT.endsWith(path.sep)
  ? NORMALIZED_PUBLIC_ROOT
  : NORMALIZED_PUBLIC_ROOT + path.sep;
const MAX_DIRECTORY_DEPTH = 4;

type PublicImagePayload = {
  file: string;
  width: number;
  height: number;
  size: number;
  url: string;
  directory: string;
};

type DirectoryStackItem = {
  abs: string;
  rel: string;
  depth: number;
};

const normalizeRelativeDir = (value: string) => value.replace(/\\/g, "/");

const ensureWithinPublicRoot = (target: string) => {
  const normalized = path.normalize(target);
  return (
    normalized === NORMALIZED_PUBLIC_ROOT ||
    normalized.startsWith(PUBLIC_ROOT_WITH_SEP)
  );
};

const resolveRelativeDirectory = (value: string | null, explicit: boolean) => {
  if (!explicit) {
    const fallback = DEFAULT_PUBLIC_UPLOAD_DIR?.trim() ?? "";
    if (!fallback) {
      return "";
    }
    const sanitized = sanitizeNestedRelativePath(fallback);
    return sanitized ?? "";
  }

  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/" || trimmed === ".") {
    return "";
  }

  const sanitized = sanitizeNestedRelativePath(trimmed);
  return sanitized ?? "";
};

const absoluteFromRelative = (relative: string) =>
  relative
    ? path.normalize(path.join(NORMALIZED_PUBLIC_ROOT, relative))
    : NORMALIZED_PUBLIC_ROOT;

const collectDirectories = async () => {
  const result = new Set<string>();
  const stack: DirectoryStackItem[] = [
    { abs: NORMALIZED_PUBLIC_ROOT, rel: "", depth: 0 },
  ];

  while (stack.length) {
    const current = stack.pop()!;
    if (current.depth >= MAX_DIRECTORY_DEPTH) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current.abs, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name.startsWith(".")) {
        continue;
      }

      const nextRel = current.rel
        ? path.join(current.rel, entry.name)
        : entry.name;
      const normalizedRel = normalizeRelativeDir(nextRel);
      const absoluteNext = path.join(current.abs, entry.name);

      if (!ensureWithinPublicRoot(absoluteNext)) {
        continue;
      }

      result.add(normalizedRel);
      stack.push({
        abs: absoluteNext,
        rel: nextRel,
        depth: current.depth + 1,
      });
    }
  }

  result.add("");
  const defaultRelative = DEFAULT_PUBLIC_UPLOAD_DIR?.trim()
    ? sanitizeNestedRelativePath(DEFAULT_PUBLIC_UPLOAD_DIR.trim())
    : "";
  if (defaultRelative) {
    result.add(normalizeRelativeDir(defaultRelative));
  }

  return Array.from(result).sort((a, b) => a.localeCompare(b));
};

const encodePathSegments = (relativePath: string) =>
  relativePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const listPublicImages = async (
  absoluteDir: string,
  relativeDir: string
): Promise<PublicImagePayload[]> => {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const images: PublicImagePayload[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const fileName = entry.name;
    if (!IMAGE_EXT.test(fileName)) {
      continue;
    }

    const absoluteFile = path.join(absoluteDir, fileName);
    if (!ensureWithinPublicRoot(absoluteFile)) {
      continue;
    }

    const stat = await fs.stat(absoluteFile).catch(() => null);
    if (!stat || !stat.isFile()) {
      continue;
    }

    let dimensions;
    try {
      const buffer = await fs.readFile(absoluteFile);
      dimensions = imageSize(buffer);
    } catch (error) {
      console.error("listPublicImages", error);
      continue;
    }

    const width = dimensions.width ?? 0;
    const height = dimensions.height ?? 0;
    if (!width || !height) {
      continue;
    }

    const relativePath = relativeDir ? `${relativeDir}/${fileName}` : fileName;
    const url = `/${encodePathSegments(relativePath)}`;

    images.push({
      file: fileName,
      width,
      height,
      size: stat.size,
      url,
      directory: relativeDir,
    });
  }

  return images.sort((a, b) => a.file.localeCompare(b.file));
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
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }

  const url = new URL(request.url);
  const hasDirParam = url.searchParams.has("dir");
  const dirParam = hasDirParam ? url.searchParams.get("dir") : null;
  const relativeDir = resolveRelativeDirectory(dirParam, hasDirParam);
  const normalizedRelativeDir = normalizeRelativeDir(relativeDir);
  const absoluteDir = absoluteFromRelative(relativeDir);

  if (!ensureWithinPublicRoot(absoluteDir)) {
    return NextResponse.json(
      { message: "Chemin de dossier invalide." },
      { status: 400 }
    );
  }

  const directories = await collectDirectories();

  let images: PublicImagePayload[] = [];
  const dirExists = await pathExists(absoluteDir);
  if (dirExists) {
    const stat = await fs.stat(absoluteDir).catch(() => null);
    if (stat?.isDirectory()) {
      images = await listPublicImages(absoluteDir, normalizedRelativeDir);
    }
  }

  return NextResponse.json(
    {
      message: "Images publiques récupérées.",
      data: images,
      directories,
      currentDir: normalizedRelativeDir,
    },
    { status: 200 }
  );
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }

  let payload: { dir?: unknown; file?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const dirValue = typeof payload.dir === "string" ? payload.dir : "";
  const relativeDir = resolveRelativeDirectory(dirValue, true);
  const normalizedRelativeDir = normalizeRelativeDir(relativeDir);

  const fileName = typeof payload.file === "string" ? payload.file.trim() : "";
  if (!fileName) {
    return NextResponse.json(
      { message: "Nom de fichier requis." },
      { status: 400 }
    );
  }

  const absoluteDir = absoluteFromRelative(relativeDir);
  if (!ensureWithinPublicRoot(absoluteDir)) {
    return NextResponse.json(
      { message: "Chemin de dossier invalide." },
      { status: 400 }
    );
  }

  if (!(await pathExists(absoluteDir))) {
    return NextResponse.json(
      { message: "Dossier introuvable." },
      { status: 404 }
    );
  }

  const targetFile = assertFileWithinFolder(absoluteDir, fileName);
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
      directory: normalizedRelativeDir,
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

  const targetDirValue = formData.get("targetDir");
  let relativeDir = DEFAULT_PUBLIC_UPLOAD_DIR;
  if (typeof targetDirValue === "string" && targetDirValue.trim()) {
    const sanitized = sanitizeNestedRelativePath(targetDirValue.trim());
    if (!sanitized) {
      return NextResponse.json(
        { message: "Chemin de destination invalide." },
        { status: 400 }
      );
    }
    relativeDir = sanitized;
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

  await fs.mkdir(PUBLIC_ROOT, { recursive: true });
  const absoluteTarget = path.normalize(path.join(PUBLIC_ROOT, relativeDir));

  if (!ensureWithinPublicRoot(absoluteTarget)) {
    return NextResponse.json(
      { message: "Chemin de dossier invalide." },
      { status: 400 }
    );
  }

  await fs.mkdir(absoluteTarget, { recursive: true });

  const saved: string[] = [];
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = (path.extname(file.name) || ".bin").toLowerCase();
      const safeBase =
        sanitizeSegment(path.parse(file.name).name) ||
        `asset-${randomUUID().slice(0, 8)}`;
      let candidateName = `${safeBase}${ext}`;
      let duplicate = 1;
      while (await pathExists(path.join(absoluteTarget, candidateName))) {
        candidateName = `${safeBase}-${duplicate++}${ext}`;
      }
      await fs.writeFile(path.join(absoluteTarget, candidateName), buffer);
      saved.push(candidateName);
    } catch (error) {
      console.error("public-images POST", error);
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
      message: `${saved.length} image(s) ajoutée(s).`,
      saved,
      directory: normalizeRelativeDir(relativeDir),
    },
    { status: 200 }
  );
}
