"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export default function Gallery() {
  const t = useTranslations("Gallery");
  const router = useRouter();
  const [galleries, setGalleries] = useState<
    Array<{ id: number; title: string }>
  >([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gallery")
      .then((response) => response.json())
      .then((data) => {
        if (data && data.data) {
          setGalleries(data.data);
        }
      })
      .catch((error) => {
        console.error("Error fetching galleries:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (!selectedId) {
      alert(t("selectPlaceholder"));
      return;
    }
    const fd = new FormData(form);
    fd.set("id", selectedId);
    const dataObj = Object.fromEntries(fd.entries());

    // Affiche les valeurs récupérées (pour debug)
    console.log("Form values:", dataObj);

    fetch("/api/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataObj),
    })
      .then(async (response) => {
        await response.json().catch(() => null);
        if (response.ok) {
          router.push(`/gallery/view?page=1`);
        } else {
          alert(t("errorMessage"));
        }
      })
      .catch((err) => {
        console.error("Request failed:", err);
      });
  };

  const recentGalleries = galleries.slice(-3).reverse();
  const cardsOnlyGalleries = [...galleries].reverse();
  const olderGalleries =
    galleries.length > 3 ? galleries.slice(0, galleries.length - 3) : [];
  const shouldShowCardsOnly =
    !isLoading && galleries.length > 0 && galleries.length <= 3;
  const shouldShowHybrid = !isLoading && galleries.length > 3;
  const isOlderSelection = olderGalleries.some(
    (gallery) => gallery.id.toString() === selectedId
  );
  const selectValue = isOlderSelection ? selectedId : "";
  const showEmptyState = !isLoading && galleries.length === 0;

  return (
    <main className="relative flex flex-1 w-full items-center justify-center px-4 py-12">
      <div className="glass-panel relative mx-auto flex w-full max-w-5xl flex-col gap-10 rounded-3xl px-6 py-10 sm:px-10">
        <div className="space-y-4 text-center">
          <p className="text-sm font-heading uppercase tracking-[0.5em] text-white/70">
            {t("heroClaim")}
          </p>
          <h1 className="font-heading font-bold text-primary text-3xl md:text-4xl">
            {t.rich("title", {
              br: () => <br />,
              highlight: (chunks) => (
                <span className="bg-linear-to-r from-[#ff8218] via-[#f15a24] to-[#c3200f] bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h1>
        </div>

        <form
          className="space-y-5 rounded-2xl border border-white/10 bg-[#070a12]/80 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.55)]"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2">
            <span className="text-xs font-heading uppercase tracking-[0.4em] text-white/60">
              {t("selectPlaceholder")}
            </span>
            {isLoading && (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            )}
            {shouldShowCardsOnly && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentGalleries.map((gallery) => {
                  const value = gallery.id.toString();
                  const isActive = selectedId === value;
                  return (
                    <label
                      key={gallery.id}
                      htmlFor={`gallery-${gallery.id}`}
                      className={cn(
                        "flex justify-between cursor-pointer gap-1 rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors",
                        isActive
                          ? "border-[#f15a24] bg-white/5"
                          : "hover:border-white/30"
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <input
                          type="radio"
                          id={`gallery-${gallery.id}`}
                          className="sr-only"
                          name="id"
                          value={value}
                          checked={isActive}
                          onChange={() => setSelectedId(value)}
                        />
                        <span className="text-lg font-heading text-white">
                          {gallery.title}
                        </span>
                      </div>
                      <div
                        className={`h-5 w-5 border rounded-full shrink-0 mt-auto ${
                          isActive
                            ? "border-[#f15a24] bg-primary"
                            : "border-white/40"
                        }`}
                      ></div>
                    </label>
                  );
                })}
              </div>
            )}
            {shouldShowHybrid && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentGalleries.map((gallery) => {
                  const value = gallery.id.toString();
                  const isActive = selectedId === value;
                  return (
                    <label
                      key={gallery.id}
                      htmlFor={`gallery-${gallery.id}`}
                      className={cn(
                        "flex justify-between cursor-pointer gap-1 rounded-2xl border border-white/10 bg-black/10 p-4 transition-colors",
                        isActive
                          ? "border-[#f15a24] bg-white/5"
                          : "hover:border-white/30"
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <input
                          type="radio"
                          id={`gallery-${gallery.id}`}
                          className="sr-only"
                          name="id"
                          value={value}
                          checked={isActive}
                          onChange={() => setSelectedId(value)}
                        />
                        <span className="text-lg font-heading text-white">
                          {gallery.title}
                        </span>
                      </div>
                      <div
                        className={`h-5 w-5 border rounded-full shrink-0 mt-auto ${
                          isActive
                            ? "border-[#f15a24] bg-primary"
                            : "border-white/40"
                        }`}
                      ></div>
                    </label>
                  );
                })}
              </div>
            )}
            {shouldShowHybrid && (
              <>
                <Select
                  value={selectValue}
                  onValueChange={(v) => setSelectedId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectAnotherPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {olderGalleries.map((gallery) => (
                        <SelectItem
                          key={gallery.id}
                          value={gallery.id.toString()}
                        >
                          {gallery.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </>
            )}
            <input type="hidden" name="id" value={selectedId} />
            {showEmptyState && (
              <p className="text-sm text-white/60">
                Aucune galerie disponible pour le moment.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-heading uppercase tracking-[0.4em] text-white/60">
              {t("passwordPlaceholder")}
            </span>
            <Input
              id="password"
              className="font-heading text-white/60"
              name="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              required
            />
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
              {t("privacyNote")}
            </p>
            <Button className="w-full text-lg md:w-auto">
              {t("buttonSubmit")}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
