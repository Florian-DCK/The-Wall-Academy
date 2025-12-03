"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { FormState } from "./AdminLoginForm";

export type TranslationEntry = {
  key: string;
  values: Record<string, string>;
};

export type CarouselItem = {
  id: string;
  image: string;
  translationKey: string;
  author: string;
};

type AdminDashboardProps = {
  locale: string;
  locales: string[];
  translations: TranslationEntry[];
  carouselItems: CarouselItem[];
  updateTranslation: (
    state: FormState,
    formData: FormData
  ) => Promise<FormState>;
  upsertCarouselItem: (
    state: FormState,
    formData: FormData
  ) => Promise<FormState>;
  deleteCarouselItem: (
    state: FormState,
    formData: FormData
  ) => Promise<FormState>;
  logout: () => Promise<void>;
};

const emptyState: FormState = {};
const NEW_TRANSLATION_OPTION = "__new__";

export default function AdminDashboard({
  locale,
  locales,
  translations,
  carouselItems,
  updateTranslation,
  upsertCarouselItem,
  deleteCarouselItem,
  logout,
}: AdminDashboardProps) {
  const router = useRouter();

  const [translationState, translationAction] = useFormState(
    updateTranslation,
    emptyState
  );
  const [carouselState, carouselAction] = useFormState(
    upsertCarouselItem,
    emptyState
  );
  const [deleteState, deleteAction] = useFormState(
    deleteCarouselItem,
    emptyState
  );

  const buildValuesFromEntry = useCallback(
    (entry?: TranslationEntry) => {
      const result: Record<string, string> = {};
      for (const currentLocale of locales) {
        result[currentLocale] = entry?.values[currentLocale] ?? "";
      }
      return result;
    },
    [locales]
  );

  const [filter, setFilter] = useState("");
  const translationsMap = useMemo(
    () => new Map(translations.map((entry) => [entry.key, entry])),
    [translations]
  );

  const [selectedKey, setSelectedKey] = useState(
    () => translations[0]?.key ?? ""
  );
  const [keyInput, setKeyInput] = useState(() => translations[0]?.key ?? "");
  const [valuesInput, setValuesInput] = useState<Record<string, string>>(() =>
    buildValuesFromEntry(translations[0])
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
  }, [buildValuesFromEntry, setFilter]);

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 py-12 text-white">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            Panneau d&#39;administration
          </h1>
          <p className="text-sm text-white/70">
            Locale active : <span className="font-mono">{locale}</span>
          </p>
        </div>
        <form action={logout}>
          <LogoutButton />
        </form>
      </header>

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
                className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
                    className="min-h-32 rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
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

      <section className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Carrousel</h2>
          <p className="text-sm text-white/70">
            Gérez les visuels et les associations de textes du carrousel
            d&#39;avis.
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
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
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
