import fs from "fs/promises";
import path from "path";
import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import AdminLoginForm, {
  type FormState,
} from "@/components/admin/AdminLoginForm";
import AdminDashboard, {
  type CarouselItem,
  type GallerySummary,
  type TranslationEntry,
} from "@/components/admin/AdminDashboard";
import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
} from "@/app/lib/admin-auth";
import carouselConfig from "@/data/carousel.json";
import { SUPPORTED_LOCALES } from "@/i18n/routing";
import { Prisma } from "@/app/generated/prisma-client/client";
import {
  DEFAULT_PUBLIC_UPLOAD_DIR,
  GALLERIES_BASE,
  PUBLIC_ROOT,
  pathExists,
  resolveGalleryFolder,
  sanitizeNestedRelativePath,
  sanitizeSegment,
} from "@/app/lib/media-manager";
import { routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/page-metadata";
import { prisma } from "@/app/lib/prisma";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return buildPageMetadata(locale, "admin", { noIndex: true });
}

type TranslationTree = Record<string, unknown>;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function flattenTranslations(
  node: TranslationTree,
  parentKey = ""
): Record<string, string> {
  return Object.entries(node).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      const composedKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof value === "string") {
        acc[composedKey] = value;
        return acc;
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        Object.assign(
          acc,
          flattenTranslations(value as TranslationTree, composedKey)
        );
      }

      return acc;
    },
    {}
  );
}

function setNestedValue(
  target: TranslationTree,
  pathSegments: string[],
  nextValue: string
) {
  const [current, ...rest] = pathSegments;
  if (!current) {
    return;
  }

  if (rest.length === 0) {
    target[current] = nextValue;
    return;
  }

  const existing = target[current];
  if (
    typeof existing !== "object" ||
    existing === null ||
    Array.isArray(existing)
  ) {
    target[current] = {};
  }

  setNestedValue(target[current] as TranslationTree, rest, nextValue);
}

function deleteNestedValue(
  target: TranslationTree,
  pathSegments: string[]
): boolean {
  const [current, ...rest] = pathSegments;
  if (!current || !(current in target)) {
    return false;
  }

  if (rest.length === 0) {
    if (Object.prototype.hasOwnProperty.call(target, current)) {
      delete target[current];
      return true;
    }
    return false;
  }

  const next = target[current];
  if (typeof next !== "object" || next === null || Array.isArray(next)) {
    return false;
  }

  const removed = deleteNestedValue(next as TranslationTree, rest);
  if (removed && Object.keys(next as TranslationTree).length === 0) {
    delete target[current];
  }

  return removed;
}

async function createGalleryAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const title = formData.get("title");
  const password = formData.get("password");
  const folder = formData.get("folder");
  const dateValue = formData.get("date");

  if (typeof title !== "string" || !title.trim()) {
    return { error: "Le titre est requis." };
  }

  if (typeof password !== "string" || !password.trim()) {
    return { error: "Le mot de passe est requis." };
  }

  const baseSegment =
    sanitizeSegment(title.trim()) || `galerie-${randomUUID().slice(0, 8)}`;
  const folderSegment =
    typeof folder === "string" && folder.trim()
      ? sanitizeSegment(folder.trim())
      : baseSegment;
  const initialSegment = folderSegment || `galerie-${randomUUID().slice(0, 8)}`;

  await fs.mkdir(GALLERIES_BASE, { recursive: true });

  let relativeSegment = initialSegment;
  let attempt = 1;
  while (await pathExists(path.join(GALLERIES_BASE, relativeSegment))) {
    relativeSegment = `${initialSegment}-${attempt++}`;
  }

  const absoluteTarget = path.join(GALLERIES_BASE, relativeSegment);
  await fs.mkdir(absoluteTarget, { recursive: true });

  try {
    await prisma.gallery.create({
      data: {
        title: title.trim(),
        password: password.trim(),
        date:
          typeof dateValue === "string" && dateValue.trim()
            ? dateValue.trim()
            : null,
        photosPath: relativeSegment,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ce mot de passe est déjà utilisé par une autre galerie.",
      };
    }
    console.error("createGalleryAction", error);
    return {
      error: "Impossible de créer la galerie. Consultez les logs.",
    };
  }

  for (const code of SUPPORTED_LOCALES) {
    revalidatePath(`/${code}/gallery`);
    revalidatePath(`/${code}/admin`);
  }

  return { success: `Galerie "${title.trim()}" créée.` };
}

async function deleteGalleryAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Acces refuse." };
  }

  const galleryIdValue =
    formData.get("galleryId") ?? formData.get("__galleryId");
  if (typeof galleryIdValue !== "string" || !galleryIdValue.trim()) {
    return { error: "Selectionnez une galerie." };
  }

  const galleryId = Number(galleryIdValue);
  if (!Number.isInteger(galleryId) || galleryId <= 0) {
    return { error: "Identifiant de galerie invalide." };
  }

  const deleteFilesValue = formData.get("deleteFiles");
  const shouldDeleteFiles =
    typeof deleteFilesValue === "string" &&
    ["1", "true", "on"].includes(deleteFilesValue);

  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, title: true, photosPath: true },
  });

  if (!galleryRecord) {
    return { error: "Galerie introuvable." };
  }

  let folderSuffix = "";
  let folderPathToDelete: string | null = null;
  if (shouldDeleteFiles) {
    const folderPath = resolveGalleryFolder(galleryRecord.photosPath);
    if (!folderPath) {
      folderSuffix = " Aucun dossier configure.";
    } else {
      const normalizedFolder = path.normalize(folderPath);
      const normalizedBase = path.normalize(GALLERIES_BASE);
      const baseWithSep = normalizedBase.endsWith(path.sep)
        ? normalizedBase
        : normalizedBase + path.sep;
      const folderWithSep = normalizedFolder.endsWith(path.sep)
        ? normalizedFolder
        : normalizedFolder + path.sep;
      const baseWithSepLower = baseWithSep.toLowerCase();
      const folderWithSepLower = folderWithSep.toLowerCase();

      if (folderWithSepLower === baseWithSepLower) {
        return {
          error: "Suppression refusee : dossier de galerie invalide.",
        };
      }

      if (!folderWithSepLower.startsWith(baseWithSepLower)) {
        return {
          error:
            "Suppression refusee : dossier de galerie hors du repertoire autorise.",
        };
      }

      folderPathToDelete = normalizedFolder;
    }
  }

  try {
    await prisma.gallery.delete({ where: { id: galleryId } });
  } catch (error) {
    console.error("deleteGalleryAction", error);
    return {
      error: "Impossible de supprimer la galerie. Consultez les logs.",
    };
  }

  if (shouldDeleteFiles && folderPathToDelete) {
    const exists = await pathExists(folderPathToDelete);
    if (exists) {
      const stat = await fs.stat(folderPathToDelete).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        folderSuffix = " Dossier introuvable.";
      } else {
        try {
          await fs.rm(folderPathToDelete, { recursive: true, force: true });
          folderSuffix = " Dossier supprime.";
        } catch (error) {
          console.error("deleteGalleryAction:deleteFolder", error);
          folderSuffix = " Suppression du dossier impossible.";
        }
      }
    } else {
      folderSuffix = " Dossier introuvable.";
    }
  }

  for (const code of SUPPORTED_LOCALES) {
    revalidatePath(`/${code}/gallery`);
    revalidatePath(`/${code}/admin`);
  }

  return {
    success: `Galerie "${galleryRecord.title}" supprimee.${folderSuffix}`,
  };
}

async function updateGalleryPasswordAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Acces refuse." };
  }

  const galleryIdValue = formData.get("galleryId");
  if (typeof galleryIdValue !== "string" || !galleryIdValue.trim()) {
    return { error: "Selectionnez une galerie." };
  }

  const galleryId = Number(galleryIdValue);
  if (!Number.isInteger(galleryId) || galleryId <= 0) {
    return { error: "Identifiant de galerie invalide." };
  }

  const passwordValue = formData.get("password");
  if (typeof passwordValue !== "string" || !passwordValue.trim()) {
    return { error: "Le mot de passe est requis." };
  }

  try {
    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: { password: passwordValue.trim() },
      select: { title: true },
    });

    for (const code of SUPPORTED_LOCALES) {
      revalidatePath(`/${code}/gallery`);
      revalidatePath(`/${code}/admin`);
    }

    return { success: `Mot de passe mis a jour pour "${updated.title}".` };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Ce mot de passe est deja utilise par une autre galerie.",
      };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { error: "Galerie introuvable." };
    }
    console.error("updateGalleryPasswordAction", error);
    return {
      error: "Impossible de modifier le mot de passe. Consultez les logs.",
    };
  }
}

async function uploadGalleryImagesAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const galleryIdValue =
    formData.get("galleryId") ?? formData.get("__galleryId");
  if (typeof galleryIdValue !== "string" || !galleryIdValue.trim()) {
    return { error: "Sélectionnez une galerie." };
  }

  const galleryId = Number(galleryIdValue);
  if (!Number.isInteger(galleryId)) {
    return { error: "Identifiant de galerie invalide." };
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return { error: "Ajoutez au moins une image." };
  }

  const galleryRecord = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, title: true, photosPath: true },
  });

  if (!galleryRecord) {
    return { error: "Galerie introuvable." };
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
    return { error: "Impossible de déterminer le dossier cible." };
  }

  await fs.mkdir(absoluteFolder, { recursive: true });

  let saved = 0;
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
      saved += 1;
    } catch (error) {
      console.error("uploadGalleryImagesAction", error);
    }
  }

  if (!saved) {
    return { error: "Aucune image enregistrée." };
  }

  for (const code of SUPPORTED_LOCALES) {
    revalidatePath(`/${code}/admin`);
  }

  return {
    success: `${saved} image(s) ajoutée(s) à ${galleryRecord.title}.`,
  };
}

async function uploadPublicImagesAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const targetDirValue = formData.get("targetDir");
  let relativeDir = DEFAULT_PUBLIC_UPLOAD_DIR;
  if (typeof targetDirValue === "string" && targetDirValue.trim()) {
    const sanitized = sanitizeNestedRelativePath(targetDirValue.trim());
    if (!sanitized) {
      return { error: "Chemin de destination invalide." };
    }
    relativeDir = sanitized;
  }

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return { error: "Ajoutez au moins une image." };
  }

  await fs.mkdir(PUBLIC_ROOT, { recursive: true });
  const absoluteTarget = path.normalize(path.join(PUBLIC_ROOT, relativeDir));
  await fs.mkdir(absoluteTarget, { recursive: true });

  let saved = 0;
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
      saved += 1;
    } catch (error) {
      console.error("uploadPublicImagesAction", error);
    }
  }

  if (!saved) {
    return { error: "Aucune image enregistrée." };
  }

  for (const code of SUPPORTED_LOCALES) {
    revalidatePath(`/${code}`);
    revalidatePath(`/${code}/admin`);
  }

  const displayPath = relativeDir.replace(/\\/g, "/");
  return {
    success: `${saved} image(s) ajoutée(s) dans ${displayPath}.`,
  };
}

async function updateTranslationAction(
  adminLocale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const locales = SUPPORTED_LOCALES;

  const originalKey = formData.get("originalKey");
  const key = formData.get("key");

  if (typeof key !== "string" || !key.trim()) {
    return { error: "La clé est requise." };
  }

  const trimmedKey = key.trim();
  const previousKey =
    typeof originalKey === "string" && originalKey.trim()
      ? originalKey.trim()
      : null;

  const translationsByLocale: Record<string, string> = {};
  for (const locale of locales) {
    const value = formData.get(`value_${locale}`);
    if (typeof value !== "string") {
      return { error: `Valeur manquante pour la locale "${locale}".` };
    }
    translationsByLocale[locale] = value;
  }

  try {
    for (const locale of locales) {
      const filePath = path.join(process.cwd(), "messages", `${locale}.json`);
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw) as TranslationTree;

      if (previousKey && previousKey !== trimmedKey) {
        deleteNestedValue(data, previousKey.split("."));
      }

      setNestedValue(data, trimmedKey.split("."), translationsByLocale[locale]);

      await fs.writeFile(
        filePath,
        `${JSON.stringify(data, null, 2)}\n`,
        "utf-8"
      );
    }

    for (const locale of locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/gallery`);
      revalidatePath(`/${locale}/admin`);
    }

    if (!locales.includes(adminLocale)) {
      revalidatePath(`/${adminLocale}`);
      revalidatePath(`/${adminLocale}/admin`);
    }

    return { success: "Traductions enregistrées." };
  } catch (error) {
    console.error("updateTranslationAction", error);
    return {
      error: "Impossible de mettre à jour les traductions. Consultez les logs.",
    };
  }
}

async function upsertCarouselItemAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const id = formData.get("id");
  const image = formData.get("image");
  const author = formData.get("author");
  const translationKey = formData.get("translationKey");

  if (typeof id !== "string" || !id.trim()) {
    return { error: "L'identifiant est requis." };
  }

  if (typeof image !== "string" || !image.trim()) {
    return { error: "Le chemin de limage est requis." };
  }

  if (typeof author !== "string" || !author.trim()) {
    return { error: "Le nom de l'auteur est requis." };
  }

  if (typeof translationKey !== "string" || !translationKey.trim()) {
    return { error: "La clé de traduction est requise." };
  }

  const filePath = path.join(process.cwd(), "data", "carousel.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const items = JSON.parse(raw) as CarouselItem[];
    const payload: CarouselItem = {
      id: id.trim(),
      image: image.trim(),
      author: author.trim(),
      translationKey: translationKey.trim(),
    };

    const existingIndex = items.findIndex((item) => item.id === payload.id);
    const nextItems = [...items];

    const message =
      existingIndex >= 0
        ? "Entrée mise à jour."
        : "Entrée ajoutée au carrousel.";

    if (existingIndex >= 0) {
      nextItems[existingIndex] = payload;
    } else {
      nextItems.push(payload);
    }

    await fs.writeFile(
      filePath,
      `${JSON.stringify(nextItems, null, 2)}\n`,
      "utf-8"
    );

    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin`);

    return { success: message };
  } catch (error) {
    console.error("upsertCarouselItemAction", error);
    return {
      error: "Impossible de mettre à jour le carrousel. Consultez les logs.",
    };
  }
}

async function deleteCarouselItemAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  const session = await getAdminSession();
  if (!session) {
    return { error: "Accès refusé." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id.trim()) {
    return { error: "L'identifiant est requis." };
  }

  const filePath = path.join(process.cwd(), "data", "carousel.json");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const items = JSON.parse(raw) as CarouselItem[];
    const nextItems = items.filter((item) => item.id !== id);

    if (nextItems.length === items.length) {
      return { error: "Entrée introuvable." };
    }

    await fs.writeFile(
      filePath,
      `${JSON.stringify(nextItems, null, 2)}\n`,
      "utf-8"
    );

    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin`);

    return { success: "Entrée supprimée." };
  } catch (error) {
    console.error("deleteCarouselItemAction", error);
    return {
      error: "Impossible de supprimer cette entrée. Consultez les logs.",
    };
  }
}

async function loginAction(
  locale: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  "use server";

  if (!ADMIN_PASSWORD) {
    return { error: "ADMIN_PASSWORD est manquant côté serveur." };
  }

  const password = formData.get("password");
  if (typeof password !== "string") {
    return { error: "Mot de passe requis." };
  }

  if (password !== ADMIN_PASSWORD) {
    return { error: "Mot de passe invalide." };
  }

  await createAdminSession();
  redirect(`/${locale}/admin`);
}

async function logoutAction(locale: string) {
  "use server";
  await clearAdminSession();
  redirect(`/${locale}/admin`);
}

export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const session = await getAdminSession();

  const locales = SUPPORTED_LOCALES;

  const localeMessages = await Promise.all(
    locales.map(async (code) => {
      const module = await import(`../../../messages/${code}.json`);
      const messages = module.default as TranslationTree;
      return { locale: code, flattened: flattenTranslations(messages) };
    })
  );

  const translationsAccumulator = new Map<
    string,
    { key: string; values: Partial<Record<string, string>> }
  >();

  for (const { locale: localeCode, flattened } of localeMessages) {
    for (const [key, value] of Object.entries(flattened)) {
      const existing = translationsAccumulator.get(key);
      if (existing) {
        existing.values[localeCode] = value;
      } else {
        translationsAccumulator.set(key, {
          key,
          values: { [localeCode]: value },
        });
      }
    }
  }

  const translations: TranslationEntry[] = Array.from(
    translationsAccumulator.values()
  )
    .map(({ key, values }) => ({
      key,
      values: locales.reduce<Record<string, string>>((acc, code) => {
        acc[code] = values[code] ?? "";
        return acc;
      }, {}),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const galleriesData = await prisma.gallery.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      password: true,
      photosPath: true,
      createdAt: true,
      date: true,
    },
  });

  const galleries: GallerySummary[] = galleriesData.map((gallery) => ({
    id: gallery.id,
    title: gallery.title,
    password: gallery.password,
    photosPath: gallery.photosPath,
    createdAt: gallery.createdAt.toISOString(),
    date: gallery.date,
  }));

  const carouselItems = (carouselConfig as CarouselItem[]).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  const galleryRootLabel = (
    process.env.GALLERIES_FOLDER?.trim() ||
    path.relative(process.cwd(), GALLERIES_BASE) ||
    "public"
  ).replace(/\\/g, "/");
  const publicRootLabel = (
    path.relative(process.cwd(), PUBLIC_ROOT) || "public"
  ).replace(/\\/g, "/");
  const publicUploadsDefault = DEFAULT_PUBLIC_UPLOAD_DIR;

  if (!session) {
    const login = loginAction.bind(null, locale);
    return (
      <main className="min-h-screen bg-linear-to-b from-black via-[#05070d] to-black text-white">
        <AdminLoginForm action={login} />
      </main>
    );
  }

  const updateTranslation = updateTranslationAction.bind(null, locale);
  const upsertCarousel = upsertCarouselItemAction.bind(null, locale);
  const deleteCarousel = deleteCarouselItemAction.bind(null, locale);
  const logout = logoutAction.bind(null, locale);
  const createGallery = createGalleryAction.bind(null, locale);
  const deleteGallery = deleteGalleryAction.bind(null, locale);
  const updateGalleryPassword = updateGalleryPasswordAction.bind(null, locale);
  const uploadGalleryImages = uploadGalleryImagesAction.bind(null, locale);
  const uploadPublicImages = uploadPublicImagesAction.bind(null, locale);

  return (
    <main className="min-h-screen bg-linear-to-b from-black via-[#05070d] to-black px-4 text-white">
      <AdminDashboard
        locale={locale}
        locales={locales}
        translations={translations}
        carouselItems={carouselItems}
        galleries={galleries}
        galleryRootLabel={galleryRootLabel}
        publicRootLabel={publicRootLabel}
        publicUploadsDefault={publicUploadsDefault}
        updateTranslation={updateTranslation}
        upsertCarouselItem={upsertCarousel}
        deleteCarouselItem={deleteCarousel}
        createGallery={createGallery}
        deleteGallery={deleteGallery}
        updateGalleryPassword={updateGalleryPassword}
        uploadGalleryImages={uploadGalleryImages}
        uploadPublicImages={uploadPublicImages}
        logout={logout}
      />
    </main>
  );
}
