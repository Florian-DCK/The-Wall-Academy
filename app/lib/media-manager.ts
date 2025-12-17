import fs from "fs/promises";
import path from "path";

export const PUBLIC_ROOT = path.join(process.cwd(), "public");
export const GALLERIES_BASE = process.env.GALLERIES_FOLDER
  ? path.normalize(
      path.isAbsolute(process.env.GALLERIES_FOLDER)
        ? process.env.GALLERIES_FOLDER
        : path.join(process.cwd(), process.env.GALLERIES_FOLDER)
    )
  : PUBLIC_ROOT;
export const DEFAULT_PUBLIC_UPLOAD_DIR = "uploads";

export const sanitizeSegment = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .toLowerCase();

export const sanitizeNestedRelativePath = (value: string) =>
  value
    .split(/[\\/]+/)
    .map((segment) => sanitizeSegment(segment))
    .filter(Boolean)
    .join(path.sep);

export const pathExists = async (targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const resolveGalleryFolder = (storedPath: string | null) => {
  if (!storedPath) {
    return null;
  }
  const normalized = storedPath.trim();
  if (!normalized) {
    return null;
  }
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.normalize(path.join(GALLERIES_BASE, normalized));
};
