"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import type { FormState } from "@/components/admin/AdminLoginForm";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export type TranslationEntry = {
  key: string;
  values: Record<string, string>;
};

export type CarouselItem = {
  id: string;
  image: string;
  author: string;
  translationKey: string;
};

export type GallerySummary = {
  id: number;
  title: string;
  password: string;
  photosPath: string | null;
  createdAt: string;
  date: string | null;
};

type GalleryImageAsset = {
  file: string;
  width: number;
  height: number;
  size: number;
  thumbnailURL: string;
  largeURL: string;
};

type PublicImageAsset = {
  file: string;
  width: number;
  height: number;
  size: number;
  url: string;
  directory: string;
};

type AdminPanelKey =
  | "translations"
  | "galleries"
  | "public-images"
  | "carousel";

type AdminPanelDefinition = {
  key: AdminPanelKey;
  label: string;
  description: string;
};

type ActionHandler = (
  state: FormState,
  formData: FormData
) => Promise<FormState>;

type AdminDashboardProps = {
  locale: string;
  locales: string[];
  translations: TranslationEntry[];
  carouselItems: CarouselItem[];
  galleries: GallerySummary[];
  galleryRootLabel: string;
  publicRootLabel: string;
  publicUploadsDefault: string;
  updateTranslation: ActionHandler;
  upsertCarouselItem: ActionHandler;
  deleteCarouselItem: ActionHandler;
  createGallery: ActionHandler;
  deleteGallery: ActionHandler;
  updateGalleryPassword: ActionHandler;
  uploadGalleryImages: ActionHandler;
  uploadPublicImages: ActionHandler;
  logout: () => Promise<void> | void;
};

type GalleryImagesResponse = {
  message?: string;
  data?: GalleryImageAsset[];
};

type PublicImagesResponse = {
  message?: string;
  data?: PublicImageAsset[];
  directories?: string[];
  currentDir?: string;
};

const NEW_TRANSLATION_OPTION = "__new_translation__";
const initialFormState: FormState = {};

const adminPanels: AdminPanelDefinition[] = [
  {
    key: "translations",
    label: "Traductions",
    description: "Modifier les contenus textuels",
  },
  {
    key: "galleries",
    label: "Galeries",
    description: "Albums privés et imports",
  },
  {
    key: "public-images",
    label: "Images publiques",
    description: "Assets visibles sur le site",
  },
  {
    key: "carousel",
    label: "Carrousel",
    description: "Témoignages et visuels",
  },
];

const normalizeDirectoryValue = (value?: string | null) => {
  if (!value) {
    return "";
  }
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+/g, "")
    .replace(/\/+/g, "/")
    .replace(/\/+$/g, "");
};

const buildDirectoryOptions = (values: string[], fallback: string) => {
  const unique = new Set<string>();
  unique.add("");
  for (const value of values) {
    const normalized = normalizeDirectoryValue(value);
    if (normalized) {
      unique.add(normalized);
    }
  }
  if (fallback) {
    unique.add(normalizeDirectoryValue(fallback));
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

const buildValuesMap = (locales: string[], entry?: TranslationEntry) =>
  locales.reduce<Record<string, string>>((accumulator, code) => {
    accumulator[code] = entry?.values?.[code] ?? "";
    return accumulator;
  }, {});

const formatFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 o";
  }
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const formatted =
    value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted.replace(/\.0$/, "")} ${units[index]}`;
};

export default function AdminDashboard(props: AdminDashboardProps) {
  const {
    locale,
    locales,
    translations,
    carouselItems,
    galleries,
    galleryRootLabel,
    publicRootLabel,
    publicUploadsDefault,
    updateTranslation,
    upsertCarouselItem,
    deleteCarouselItem,
    createGallery,
    deleteGallery,
    updateGalleryPassword,
    uploadPublicImages,
    logout,
  } = props;

  const router = useRouter();
  const normalizedDefaultPublicDir =
    normalizeDirectoryValue(publicUploadsDefault);

  const createGalleryFormRef = useRef<HTMLFormElement>(null);
  const galleryUploadFormRef = useRef<HTMLFormElement>(null);
  const publicUploadFormRef = useRef<HTMLFormElement>(null);

  const [translationState, translationAction] = useActionState(
    updateTranslation,
    initialFormState
  );
  const [carouselState, carouselAction] = useActionState(
    upsertCarouselItem,
    initialFormState
  );
  const [deleteState, deleteAction] = useActionState(
    deleteCarouselItem,
    initialFormState
  );
  const [createGalleryState, createGalleryAction] = useActionState(
    createGallery,
    initialFormState
  );
  const [deleteGalleryState, deleteGalleryAction] = useActionState(
    deleteGallery,
    initialFormState
  );
  const [updateGalleryPasswordState, updateGalleryPasswordAction] =
    useActionState(updateGalleryPassword, initialFormState);
  const [publicUploadState, publicUploadAction] = useActionState(
    uploadPublicImages,
    initialFormState
  );

  const [activePanel, setActivePanel] = useState<AdminPanelKey>("translations");

  const [filter, setFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState(
    () => translations[0]?.key ?? ""
  );
  const [keyInput, setKeyInput] = useState(() => translations[0]?.key ?? "");
  const [valuesInput, setValuesInput] = useState<Record<string, string>>(() =>
    buildValuesMap(locales, translations[0])
  );

  const translationsMap = useMemo(
    () => new Map(translations.map((entry) => [entry.key, entry])),
    [translations]
  );

  const filteredTranslations = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return translations;
    }
    return translations.filter((entry) =>
      entry.key.toLowerCase().includes(query)
    );
  }, [filter, translations]);

  const buildValuesFromEntry = useCallback(
    (entry?: TranslationEntry) => buildValuesMap(locales, entry),
    [locales]
  );

  useEffect(() => {
    if (!selectedKey) {
      return;
    }
    if (!translationsMap.has(selectedKey)) {
      return;
    }
    if (!filteredTranslations.some((entry) => entry.key === selectedKey)) {
      const fallback = filteredTranslations[0]?.key ?? "";
      setSelectedKey(fallback);
    }
  }, [filteredTranslations, selectedKey, translationsMap]);

  useEffect(() => {
    if (!selectedKey) {
      setKeyInput("");
      setValuesInput(buildValuesFromEntry());
      return;
    }

    setKeyInput(selectedKey);
    const entry = translationsMap.get(selectedKey);
    setValuesInput(buildValuesFromEntry(entry));
  }, [selectedKey, translationsMap, buildValuesFromEntry]);

  const handleValueChange = useCallback(
    (localeCode: string, nextValue: string) => {
      setValuesInput((previous) => ({ ...previous, [localeCode]: nextValue }));
    },
    []
  );

  const handleNewEntry = useCallback(() => {
    setSelectedKey("");
    setKeyInput("");
    setValuesInput(buildValuesFromEntry());
    setFilter("");
  }, [buildValuesFromEntry]);

  const [selectedGalleryId, setSelectedGalleryId] = useState<string>(() =>
    galleries[0]?.id ? String(galleries[0].id) : ""
  );
  const [passwordUpdateTarget, setPasswordUpdateTarget] = useState<
    string | null
  >(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImageAsset[]>([]);
  const [galleryImagesError, setGalleryImagesError] = useState<string | null>(
    null
  );
  const [isLoadingGalleryImages, setIsLoadingGalleryImages] = useState(false);
  const [galleryUploadState, setGalleryUploadState] = useState<FormState | null>(
    null
  );
  const [isUploadingGalleryImages, setIsUploadingGalleryImages] =
    useState(false);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [selectedPublicDir, setSelectedPublicDir] = useState<string>(
    () => normalizedDefaultPublicDir
  );
  const [publicDirectoryOptions, setPublicDirectoryOptions] = useState<
    string[]
  >(() => buildDirectoryOptions([], normalizedDefaultPublicDir));
  const [publicImages, setPublicImages] = useState<PublicImageAsset[]>([]);
  const [publicImagesError, setPublicImagesError] = useState<string | null>(
    null
  );
  const [isLoadingPublicImages, setIsLoadingPublicImages] = useState(false);

  const [deleteImageState, setDeleteImageState] = useState<FormState | null>(
    null
  );
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [deletePublicImageState, setDeletePublicImageState] =
    useState<FormState | null>(null);
  const [isDeletingPublicImage, setIsDeletingPublicImage] = useState<
    string | null
  >(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale]
  );

  const loadGalleryImages = useCallback(async (galleryId: string) => {
    if (!galleryId) {
      setGalleryImages([]);
      setGalleryImagesError(null);
      return;
    }

    setIsLoadingGalleryImages(true);
    setGalleryImagesError(null);

    try {
      const response = await fetch(
        `/api/admin/gallery-images?galleryId=${encodeURIComponent(galleryId)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as GalleryImagesResponse | null;

      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : "Impossible de récupérer les images de la galerie.";
        setGalleryImages([]);
        setGalleryImagesError(message);
        return;
      }

      setGalleryImages(Array.isArray(payload?.data) ? payload!.data : []);
    } catch (error) {
      console.error("loadGalleryImages", error);
      setGalleryImages([]);
      setGalleryImagesError("Impossible de charger les images.");
    } finally {
      setIsLoadingGalleryImages(false);
    }
  }, []);

  const loadPublicImages = useCallback(
    async (directory: string) => {
      const normalizedDir = normalizeDirectoryValue(directory);
      const params = new URLSearchParams();
      if (normalizedDir) {
        params.set("dir", normalizedDir);
      }

      setIsLoadingPublicImages(true);
      setPublicImagesError(null);

      try {
        const response = await fetch(
          `/api/admin/public-images${
            params.size ? `?${params.toString()}` : ""
          }`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const payload = (await response
          .json()
          .catch(() => null)) as PublicImagesResponse | null;

        if (!response.ok) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : "Impossible de récupérer les images publiques.";
          setPublicImages([]);
          setPublicImagesError(message);
          return;
        }

        setPublicImages(Array.isArray(payload?.data) ? payload!.data : []);

        if (Array.isArray(payload?.directories)) {
          setPublicDirectoryOptions(
            buildDirectoryOptions(
              payload.directories,
              normalizedDefaultPublicDir
            )
          );
        }
      } catch (error) {
        console.error("loadPublicImages", error);
        setPublicImages([]);
        setPublicImagesError("Impossible de charger les images publiques.");
      } finally {
        setIsLoadingPublicImages(false);
      }
    },
    [normalizedDefaultPublicDir]
  );

  const formatPublicDirectoryLabel = useCallback(
    (dir: string) => {
      const normalized = normalizeDirectoryValue(dir);
      return normalized
        ? `${publicRootLabel}/${normalized}`
        : `${publicRootLabel} (racine)`;
    },
    [publicRootLabel]
  );

  useEffect(() => {
    if (!galleries.length) {
      if (selectedGalleryId) {
        setSelectedGalleryId("");
      }
      return;
    }

    const selectionExists = galleries.some(
      (gallery) => String(gallery.id) === selectedGalleryId
    );

    if (!selectionExists) {
      setSelectedGalleryId(String(galleries[0].id));
    }
  }, [galleries, selectedGalleryId]);

  useEffect(() => {
    if (selectedGalleryId) {
      loadGalleryImages(selectedGalleryId);
    } else {
      setGalleryImages([]);
      setGalleryImagesError(null);
    }
  }, [selectedGalleryId, loadGalleryImages]);

  useEffect(() => {
    loadPublicImages(selectedPublicDir);
  }, [selectedPublicDir, loadPublicImages]);

  const handleDeleteImage = useCallback(
    async (file: string) => {
      if (!selectedGalleryId) {
        return;
      }

      setIsDeletingImage(file);
      setDeleteImageState(null);

      try {
        const response = await fetch("/api/admin/gallery-images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            galleryId: selectedGalleryId,
            file,
          }),
        });

        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        if (!response.ok) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : "Impossible de supprimer l'image.";
          setDeleteImageState({ error: message });
          return;
        }

        const successMessage =
          typeof payload?.message === "string"
            ? payload.message
            : "Image supprimée.";
        setDeleteImageState({ success: successMessage });
      } catch (error) {
        console.error("handleDeleteImage", error);
        setDeleteImageState({ error: "Impossible de supprimer cette image." });
      } finally {
        setIsDeletingImage(null);
      }
    },
    [selectedGalleryId]
  );

  const handleDeletePublicImage = useCallback(
    async (file: string, directory: string) => {
      const normalizedDir = normalizeDirectoryValue(directory);
      const identifier = `${normalizedDir || "/"}::${file}`;
      setIsDeletingPublicImage(identifier);
      setDeletePublicImageState(null);

      try {
        const response = await fetch("/api/admin/public-images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            dir: normalizedDir,
            file,
          }),
        });

        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        if (!response.ok) {
          const message =
            typeof payload?.message === "string"
              ? payload.message
              : "Impossible de supprimer l'image.";
          setDeletePublicImageState({ error: message });
          return;
        }

        const successMessage =
          typeof payload?.message === "string"
            ? payload.message
            : "Image supprimée.";
        setDeletePublicImageState({ success: successMessage });
      } catch (error) {
        console.error("handleDeletePublicImage", error);
        setDeletePublicImageState({
          error: "Impossible de supprimer cette image.",
        });
      } finally {
        setIsDeletingPublicImage(null);
      }
    },
    []
  );

  const handleDeleteGallerySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (!selectedGalleryId) {
        event.preventDefault();
        return;
      }

      const form = event.currentTarget;
      const deleteFiles = (
        form.elements.namedItem("deleteFiles") as HTMLInputElement | null
      )?.checked;
      const selectedGallery = galleries.find(
        (gallery) => String(gallery.id) === selectedGalleryId
      );
      const title = selectedGallery?.title ?? "cette galerie";
      const message = deleteFiles
        ? `Supprimer la galerie "${title}" et son dossier d'images ?`
        : `Supprimer la galerie "${title}" ?`;

      if (!window.confirm(message)) {
        event.preventDefault();
      }
    },
    [galleries, selectedGalleryId]
  );

  const handleUpdateGalleryPasswordSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const form = event.currentTarget;
      const galleryId = (
        form.elements.namedItem("galleryId") as HTMLInputElement | null
      )?.value;
      setPasswordUpdateTarget(galleryId?.trim() || null);
    },
    []
  );

  const handleUploadGalleryImages = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedGalleryId) {
        setGalleryUploadState({ error: "Sélectionnez une galerie." });
        return;
      }

      const form = event.currentTarget;
      const filesInput = form.elements.namedItem("files") as
        | HTMLInputElement
        | null;
      const files = filesInput?.files ? Array.from(filesInput.files) : [];

      if (!files.length) {
        setGalleryUploadState({ error: "Ajoutez au moins une image." });
        return;
      }

      setGalleryUploadState(null);
      setIsUploadingGalleryImages(true);
      setGalleryUploadProgress({ current: 0, total: files.length });

      let uploaded = 0;

      try {
        for (const [index, file] of files.entries()) {
          setGalleryUploadProgress({ current: index, total: files.length });

          const body = new FormData();
          body.set("galleryId", selectedGalleryId);
          body.append("files", file, file.name);

          const response = await fetch("/api/admin/gallery-images", {
            method: "POST",
            body,
            credentials: "include",
          });

          const payload = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;

          if (!response.ok) {
            const message =
              typeof payload?.message === "string"
                ? payload.message
                : "Impossible d'importer les images.";
            setGalleryUploadState({ error: message });
            return;
          }

          uploaded += 1;
        }

        setGalleryUploadState({
          success: `${uploaded} image(s) ajoutée(s).`,
        });
        form.reset();

        if (selectedGalleryId) {
          await loadGalleryImages(selectedGalleryId);
        }
        router.refresh();
      } catch (error) {
        console.error("handleUploadGalleryImages", error);
        setGalleryUploadState({
          error: "Impossible d'importer les images.",
        });
      } finally {
        setGalleryUploadProgress(null);
        setIsUploadingGalleryImages(false);
      }
    },
    [loadGalleryImages, router, selectedGalleryId]
  );

  useEffect(() => {
    if (translationState?.success) {
      const trimmedKey = keyInput.trim();
      if (trimmedKey) {
        setSelectedKey(trimmedKey);
      }
      router.refresh();
    }
  }, [translationState?.success, keyInput, router]);

  useEffect(() => {
    if (carouselState?.success) {
      router.refresh();
    }
  }, [carouselState?.success, router]);

  useEffect(() => {
    if (deleteState?.success) {
      router.refresh();
    }
  }, [deleteState?.success, router]);

  useEffect(() => {
    if (createGalleryState?.success) {
      createGalleryFormRef.current?.reset();
      router.refresh();
    }
  }, [createGalleryState?.success, router]);

  useEffect(() => {
    if (deleteGalleryState?.success) {
      router.refresh();
    }
  }, [deleteGalleryState?.success, router]);

  useEffect(() => {
    if (updateGalleryPasswordState?.success) {
      router.refresh();
    }
  }, [updateGalleryPasswordState?.success, router]);

  useEffect(() => {
    if (publicUploadState?.success) {
      publicUploadFormRef.current?.reset();
      loadPublicImages(selectedPublicDir);
    }
  }, [publicUploadState?.success, selectedPublicDir, loadPublicImages]);

  useEffect(() => {
    if (deleteImageState?.success && selectedGalleryId) {
      loadGalleryImages(selectedGalleryId);
    }
  }, [deleteImageState?.success, selectedGalleryId, loadGalleryImages]);

  useEffect(() => {
    if (deletePublicImageState?.success) {
      loadPublicImages(selectedPublicDir);
    }
  }, [deletePublicImageState?.success, selectedPublicDir, loadPublicImages]);

  const renderTranslationsPanel = () => (
    <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Traductions</h2>
        <p className="text-sm text-white/70">
          Sélectionnez une clé à modifier ou créez une nouvelle entrée. Les
          champs ci-dessous couvrent toutes les langues prises en charge.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-3">
          <input
            type="search"
            placeholder="Filtrer les clés"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="h-72 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            <select
              value={selectedKey || NEW_TRANSLATION_OPTION}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === NEW_TRANSLATION_OPTION) {
                  handleNewEntry();
                  return;
                }
                setSelectedKey(nextValue);
              }}
              size={12}
              className="h-full w-full cursor-pointer bg-transparent p-2 text-left text-sm focus:outline-none"
            >
              <option
                value={NEW_TRANSLATION_OPTION}
                className="bg-black text-white/70"
              >
                ➕ Nouvelle clé
              </option>
              {filteredTranslations.map((entry) => {
                const missingLocales = locales.filter(
                  (code) => !entry.values[code]?.trim()
                );
                const label =
                  missingLocales.length === 0
                    ? entry.key
                    : `${entry.key} · ${missingLocales.length}/${locales.length} manquante(s)`;

                return (
                  <option
                    key={entry.key}
                    value={entry.key}
                    className={`bg-black ${
                      missingLocales.length ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            type="button"
            onClick={handleNewEntry}
            className="rounded-lg border border-dashed border-white/20 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white"
          >
            Nouvelle traduction
          </button>
        </div>

        <form
          action={translationAction}
          className="flex flex-col gap-4 rounded-lg border border-white/10 bg-black/40 p-4"
        >
          <label className="flex flex-col gap-2 text-sm font-medium">
            Clé
            <input
              name="key"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              placeholder="Example: Home.title"
              className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              required
            />
          </label>
          {selectedKey === "" ? (
            <p className="text-xs text-white/60">
              Nouvelle entrée : chaque champ ci-dessous sera créé dans toutes
              les langues.
            </p>
          ) : null}
          <input type="hidden" name="originalKey" value={selectedKey} />
          <div className="grid gap-3 md:grid-cols-3">
            {locales.map((code) => (
              <label
                key={code}
                className="flex flex-col gap-2 text-sm font-medium"
              >
                {code.toUpperCase()}
                <textarea
                  name={`value_${code}`}
                  value={valuesInput[code] ?? ""}
                  onChange={(event) =>
                    handleValueChange(code, event.target.value)
                  }
                  rows={4}
                  className="min-h-32 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>
            ))}
          </div>
          {translationState?.error ? (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {translationState.error}
            </p>
          ) : null}
          {translationState?.success ? (
            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {translationState.success}
            </p>
          ) : null}
          <SubmitButton>Enregistrer</SubmitButton>
        </form>
      </div>
    </section>
  );

  const renderGalleriesPanel = () => (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Albums de la galerie</h2>
          <p className="text-sm text-white/70">
            Les dossiers sont gérés sous{" "}
            <code className="font-mono text-xs text-white/80">
              {galleryRootLabel}
            </code>
            .
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-4">
              {galleries.length ? (
                <ul className="grid gap-3">
                  {galleries.map((gallery) => {
                    const hasFolder = Boolean(gallery.photosPath?.trim());
                    const eventDate = gallery.date?.trim();
                    return (
                      <li
                        key={gallery.id}
                        className="rounded-lg border border-white/10 bg-black/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-base font-semibold text-white">
                              {gallery.title}
                            </p>
                            <p className="text-xs text-white/60">
                              Mot de passe :{" "}
                              <code className="font-mono text-[0.75rem] text-white/80">
                                {gallery.password}
                              </code>
                            </p>
                            <p className="text-xs text-white/60">
                              Créée le{" "}
                              {dateFormatter.format(
                                new Date(gallery.createdAt)
                              )}
                              {eventDate ? ` • ${eventDate}` : ""}
                            </p>
                            <p
                              className={`text-xs ${
                                hasFolder ? "text-white/60" : "text-amber-300"
                              }`}
                            >
                              Dossier :{" "}
                              {hasFolder ? (
                                <code className="font-mono text-[0.75rem] text-white/80">
                                  {gallery.photosPath}
                                </code>
                              ) : (
                                "non configuré"
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-white/50">
                            #{gallery.id}
                          </span>
                        </div>
                        <form
                          action={updateGalleryPasswordAction}
                          onSubmit={handleUpdateGalleryPasswordSubmit}
                          className="mt-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/40 p-3"
                        >
                          <input
                            type="hidden"
                            name="galleryId"
                            value={gallery.id}
                          />
                          <label className="flex flex-col gap-1 text-xs font-medium">
                            Nouveau mot de passe
                            <input
                              name="password"
                              type="text"
                              required
                              className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                            />
                          </label>
                          {passwordUpdateTarget === String(gallery.id) &&
                          updateGalleryPasswordState?.error ? (
                            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                              {updateGalleryPasswordState.error}
                            </p>
                          ) : null}
                          {passwordUpdateTarget === String(gallery.id) &&
                          updateGalleryPasswordState?.success ? (
                            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
                              {updateGalleryPasswordState.success}
                            </p>
                          ) : null}
                          <SubmitButton>Modifier</SubmitButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-white/60">
                  Aucune galerie enregistrée pour le moment.
                </p>
              )}
            </div>
            <form
              action={deleteGalleryAction}
              onSubmit={handleDeleteGallerySubmit}
              className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
            >
              <h3 className="text-lg font-semibold">Supprimer une galerie</h3>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Album
                <select
                  name="galleryId"
                  value={selectedGalleryId}
                  onChange={(event) => setSelectedGalleryId(event.target.value)}
                  className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                  disabled={!galleries.length}
                >
                  {galleries.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.title}
                    </option>
                  ))}
                </select>
              </label>
              {!galleries.length ? (
                <p className="text-xs text-amber-300">
                  Aucune galerie a supprimer pour le moment.
                </p>
              ) : null}
              <label className="flex items-start gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  name="deleteFiles"
                  value="1"
                  disabled={!galleries.length}
                  className="mt-0.5 rounded border-white/20 bg-black/60 text-red-400 focus:ring-2 focus:ring-red-500"
                />
                Supprimer aussi le dossier et toutes les images.
              </label>
              <p className="text-xs text-white/60">
                Cette action est irreversible.
              </p>
              {deleteGalleryState?.error ? (
                <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                  {deleteGalleryState.error}
                </p>
              ) : null}
              {deleteGalleryState?.success ? (
                <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
                  {deleteGalleryState.success}
                </p>
              ) : null}
              <DeleteGalleryButton disabled={!galleries.length}>
                Supprimer la galerie
              </DeleteGalleryButton>
            </form>
          </div>
          <form
            ref={createGalleryFormRef}
            action={createGalleryAction}
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
          >
            <h3 className="text-lg font-semibold">Nouvelle galerie</h3>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Titre
              <input
                name="title"
                required
                placeholder="Stage U12"
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Mot de passe
              <input
                name="password"
                required
                placeholder="Code partagé avec l'équipe"
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Date (optionnelle)
              <input
                type="date"
                name="date"
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Sous-dossier (optionnel)
              <input
                name="folder"
                placeholder="stage-u12-hiver"
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <span className="text-xs text-white/60">
                Utilise lettres, chiffres ou tirets. Laisser vide pour générer
                automatiquement.
              </span>
            </label>
            {createGalleryState?.error ? (
              <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
                {createGalleryState.error}
              </p>
            ) : null}
            {createGalleryState?.success ? (
              <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
                {createGalleryState.success}
              </p>
            ) : null}
            <SubmitButton>Créer la galerie</SubmitButton>
          </form>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Importer dans une galerie</h2>
          <p className="text-sm text-white/70">
            Ajoutez des images directement dans le dossier de l'album
            sélectionné.
          </p>
        </header>
        <form
          ref={galleryUploadFormRef}
          onSubmit={handleUploadGalleryImages}
          className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
        >
          <input type="hidden" name="galleryId" value={selectedGalleryId} />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Album
            <select
              name="__galleryId"
              value={selectedGalleryId}
              onChange={(event) => setSelectedGalleryId(event.target.value)}
              className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              required
              disabled={!galleries.length}
            >
              {galleries.map((gallery) => (
                <option key={gallery.id} value={gallery.id}>
                  {gallery.title}
                </option>
              ))}
            </select>
          </label>
          {!galleries.length ? (
            <p className="text-xs text-amber-300">
              Créez d'abord une galerie pour activer l'import.
            </p>
          ) : null}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fichiers image
            <input
              name="files"
              type="file"
              accept="image/*"
              multiple
              required
              disabled={!galleries.length}
              className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90 focus:border-primary focus:outline-none"
            />
          </label>
          {galleryUploadState?.error ? (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {galleryUploadState.error}
            </p>
          ) : null}
          {galleryUploadState?.success ? (
            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {galleryUploadState.success}
            </p>
          ) : null}
          {galleryUploadProgress ? (
            <p className="text-xs text-white/60">
              Import en cours : {galleryUploadProgress.current + 1}/
              {galleryUploadProgress.total}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isUploadingGalleryImages || !galleries.length}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploadingGalleryImages ? "Import..." : "Importer les images"}
          </button>
        </form>
      </section>

      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Contenu de la galerie</h2>
          <p className="text-sm text-white/70">
            Visualisez les images présentes dans l'album sélectionné et
            supprimez celles qui ne sont plus nécessaires.
          </p>
        </header>

        {deleteImageState?.error ? (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {deleteImageState.error}
          </p>
        ) : null}
        {deleteImageState?.success ? (
          <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
            {deleteImageState.success}
          </p>
        ) : null}
        {galleryImagesError ? (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {galleryImagesError}
          </p>
        ) : null}

        <div className="min-h-40 rounded-lg border border-white/10 bg-black/40 p-4">
          {!selectedGalleryId ? (
            <p className="text-sm text-white/60">
              Sélectionnez un album pour afficher les images disponibles.
            </p>
          ) : isLoadingGalleryImages ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : galleryImages.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {galleryImages.map((asset) => (
                <div
                  key={asset.file}
                  className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/50 p-3"
                >
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <img
                      src={asset.thumbnailURL}
                      alt={asset.file}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-white/70">
                    <span className="truncate text-sm font-semibold text-white">
                      {asset.file}
                    </span>
                    <span>
                      {asset.width} × {asset.height} •{" "}
                      {formatFileSize(asset.size)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={asset.largeURL}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                    >
                      Aperçu
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(asset.file)}
                      disabled={isDeletingImage === asset.file}
                      className="rounded-lg border border-red-500/60 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeletingImage === asset.file
                        ? "Suppression…"
                        : "Supprimer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">
              Aucun fichier dans cet album pour le moment.
            </p>
          )}
        </div>
      </section>
    </div>
  );

  const renderPublicImagesPanel = () => (
    <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Images publiques</h2>
        <p className="text-sm text-white/70">
          Déposez des visuels utilisables sur l'accueil ou d'autres pages. Les
          fichiers sont copiés dans{" "}
          <code className="font-mono text-xs text-white/80">
            {publicRootLabel}
          </code>
          .
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          ref={publicUploadFormRef}
          action={publicUploadAction}
          className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Sous-dossier (optionnel)
            <input
              key={selectedPublicDir || "__root__"}
              name="targetDir"
              placeholder="uploads/home"
              className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              defaultValue={selectedPublicDir || ""}
            />
            <span className="text-xs text-white/60">
              Laisser vide pour utiliser "{publicUploadsDefault}".
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fichiers image
            <input
              name="files"
              type="file"
              accept="image/*"
              multiple
              required
              className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90 focus:border-primary focus:outline-none"
            />
          </label>
          {publicUploadState?.error ? (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {publicUploadState.error}
            </p>
          ) : null}
          {publicUploadState?.success ? (
            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {publicUploadState.success}
            </p>
          ) : null}
          <SubmitButton>Ajouter au dossier public</SubmitButton>
        </form>

        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Dossier
              <select
                value={selectedPublicDir}
                onChange={(event) =>
                  setSelectedPublicDir(
                    normalizeDirectoryValue(event.target.value)
                  )
                }
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {publicDirectoryOptions.map((dirOption) => (
                  <option key={dirOption || "__root__"} value={dirOption}>
                    {formatPublicDirectoryLabel(dirOption)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => loadPublicImages(selectedPublicDir)}
              className="self-start rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingPublicImages}
            >
              Rafraîchir
            </button>
          </div>

          {deletePublicImageState?.error ? (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {deletePublicImageState.error}
            </p>
          ) : null}
          {deletePublicImageState?.success ? (
            <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              {deletePublicImageState.success}
            </p>
          ) : null}
          {publicImagesError ? (
            <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {publicImagesError}
            </p>
          ) : null}

          <p className="text-xs text-white/60">
            Chemin courant :{" "}
            <code className="font-mono text-[0.75rem] text-white/80">
              {formatPublicDirectoryLabel(selectedPublicDir)}
            </code>
          </p>

          <div className="min-h-40 rounded-lg border border-white/10 bg-black/30 p-4">
            {isLoadingPublicImages ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : publicImages.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publicImages.map((asset) => {
                  const deletionKey = `${asset.directory || "/"}::${
                    asset.file
                  }`;
                  return (
                    <div
                      key={`${asset.directory}/${asset.file}`}
                      className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/50 p-3"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <img
                          src={asset.url}
                          alt={asset.file}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-white/70">
                        <span className="truncate text-sm font-semibold text-white">
                          {asset.file}
                        </span>
                        <span>
                          {asset.width} × {asset.height} •{" "}
                          {formatFileSize(asset.size)}
                        </span>
                        <span className="text-[0.7rem] text-white/50">
                          {formatPublicDirectoryLabel(asset.directory)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                          Aperçu
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeletePublicImage(asset.file, asset.directory)
                          }
                          disabled={isDeletingPublicImage === deletionKey}
                          className="rounded-lg border border-red-500/60 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingPublicImage === deletionKey
                            ? "Suppression…"
                            : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-white/60">
                Aucun fichier dans ce dossier pour le moment.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  const renderCarouselPanel = () => (
    <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <header className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Carrousel</h2>
        <p className="text-sm text-white/70">
          Gérez les visuels et les associations de textes du carrousel d'avis.
        </p>
      </header>

      {carouselState?.error ? (
        <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {carouselState.error}
        </p>
      ) : null}
      {carouselState?.success ? (
        <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {carouselState.success}
        </p>
      ) : null}
      {deleteState?.error ? (
        <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {deleteState.error}
        </p>
      ) : null}
      {deleteState?.success ? (
        <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {deleteState.success}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {carouselItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
          >
            <h3 className="font-semibold">Entrée {item.id}</h3>
            <form action={carouselAction} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={item.id} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Chemin image
                <input
                  name="image"
                  defaultValue={item.image}
                  placeholder="/images/..."
                  className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Auteur
                <input
                  name="author"
                  defaultValue={item.author}
                  className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Clé de traduction
                <input
                  name="translationKey"
                  defaultValue={item.translationKey}
                  placeholder="Carousel.caption..."
                  className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </label>
              <SubmitButton>Mettre à jour</SubmitButton>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="id" value={item.id} />
              <DeleteButton />
            </form>
          </div>
        ))}
      </div>

      <form
        action={carouselAction}
        className="flex flex-col gap-3 rounded-lg border border-dashed border-white/20 bg-black/30 p-4"
      >
        <h3 className="font-semibold">Ajouter une entrée</h3>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Identifiant (unique)
          <input
            name="id"
            placeholder="t7"
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Chemin image
          <input
            name="image"
            placeholder="/nouvelle-image.jpeg"
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Auteur
          <input
            name="author"
            placeholder="Nom et catégorie"
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Clé de traduction
          <input
            name="translationKey"
            placeholder="Carousel.captionNouvelAvis"
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            required
          />
        </label>
        <SubmitButton>Créer</SubmitButton>
      </form>
    </section>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-12 text-white">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Panneau d'administration</h1>
          <p className="text-sm text-white/70">
            Locale active : <span className="font-mono">{locale}</span>
          </p>
        </div>
        <form action={logout}>
          <LogoutButton />
        </form>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg lg:sticky lg:top-24 lg:w-64">
          <nav className="flex flex-col gap-2">
            {adminPanels.map((panel) => {
              const isActive = panel.key === activePanel;
              return (
                <button
                  key={panel.key}
                  type="button"
                  onClick={() => setActivePanel(panel.key)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-primary bg-primary/20 text-white"
                      : "border-white/10 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="text-sm font-semibold">{panel.label}</span>
                  <span className="text-xs text-white/60">
                    {panel.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">
          {activePanel === "translations" ? renderTranslationsPanel() : null}
          {activePanel === "galleries" ? renderGalleriesPanel() : null}
          {activePanel === "public-images" ? renderPublicImagesPanel() : null}
          {activePanel === "carousel" ? renderCarouselPanel() : null}
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Suppression…" : "Supprimer"}
    </button>
  );
}

function DeleteGalleryButton({
  children,
  disabled,
}: {
  children?: ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="mt-2 w-full rounded-lg border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Suppression..." : children ?? "Supprimer"}
    </button>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
