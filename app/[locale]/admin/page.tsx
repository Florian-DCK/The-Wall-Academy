import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AdminLoginForm, {
  type FormState,
} from "@/components/admin/AdminLoginForm";
import AdminDashboard, {
  type CarouselItem,
  type TranslationEntry,
} from "@/components/admin/AdminDashboard";
import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
} from "@/app/lib/admin-auth";
import carouselConfig from "@/data/carousel.json";
import { SUPPORTED_LOCALES } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

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

  const carouselItems = (carouselConfig as CarouselItem[]).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

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

  return (
    <main className="min-h-screen bg-linear-to-b from-black via-[#05070d] to-black px-4 text-white">
      <AdminDashboard
        locale={locale}
        locales={locales}
        translations={translations}
        carouselItems={carouselItems}
        updateTranslation={updateTranslation}
        upsertCarouselItem={upsertCarousel}
        deleteCarouselItem={deleteCarousel}
        logout={logout}
      />
    </main>
  );
}
