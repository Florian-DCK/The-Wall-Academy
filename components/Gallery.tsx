"use client";

import React, { useCallback, useEffect } from "react";
import Image from "next/image";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

type GalleryProps = {
  childrens?: React.ReactNode;
  galleryID: string;
  images: Array<{
    largeURL: string;
    thumbnailURL: string;
    width: number;
    height: number;
    priorityRank?: number;
  }>;
};

const normalizeGalleryId = (rawId: string) => {
  const trimmed = rawId.trim();
  if (/^[A-Za-z][\w:-]*$/.test(trimmed)) {
    return trimmed;
  }
  const sanitized = trimmed.replace(/[^A-Za-z0-9_-]+/g, "-") || "gallery";
  return `pswp-${sanitized}`;
};

const Gallery: React.FC<GalleryProps> = ({ galleryID, images }) => {
  const normalizedGalleryId = normalizeGalleryId(galleryID);
  const getPriorityState = (rank?: number) =>
    typeof rank === "number" && rank > 0 && rank <= 3;

  const downloadImage = useCallback((url: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  useEffect(() => {
    const lightbox = new PhotoSwipeLightbox({
      gallery: `#${normalizedGalleryId}`,
      children: "a",
      pswpModule: () => import("photoswipe"),
    });

    lightbox.on("afterInit", () => {
      const pswp = lightbox.pswp;
      if (!pswp) return;

      // Ajoute une classe globale pour cacher la navigation
      document.documentElement.classList.add("lightbox-open");

      // Crée le bouton overlay
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "pswp-download-btn bg-primary absolute bottom-4 right-4 z-50 flex size-11 items-center justify-center rounded-full border border-primary bg-black/50 text-white transition hover:border-white hover:bg-white hover:text-black";
      btn.innerHTML =
        '<svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" /></svg>';

      const updateState = () => {
        const src = pswp.currSlide?.data?.src;
        btn.dataset.src = src ?? "";
        btn.disabled = !src;
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const src = pswp.currSlide?.data?.src;
        if (src) downloadImage(src);
      });

      pswp.element?.appendChild(btn);
      updateState();
      pswp.on("change", updateState);
      pswp.on("close", () => {
        pswp.off("change", updateState);
        btn.remove();
        document.documentElement.classList.remove("lightbox-open");
      });
    });

    lightbox.init();
    return () => {
      lightbox.destroy();
      document.documentElement.classList.remove("lightbox-open");
    };
  }, [downloadImage, normalizedGalleryId]);

  return (
    <div
      id={normalizedGalleryId}
      className="pswp-gallery grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 lg:pt-10"
    >
      {images.map((image, index) => {
        const priority = getPriorityState(image.priorityRank);
        return (
          <div
            key={`${galleryID}-${index}`}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#090d16]/70 shadow-[0_25px_60px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1"
          >
            <a
              href={image.largeURL}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <div className="relative h-48 w-full md:h-60 lg:h-72">
                <Image
                  src={image.thumbnailURL}
                  alt=""
                  fill
                  className="object-cover"
                  loading={priority ? "eager" : "lazy"}
                  priority={priority}
                  fetchPriority={priority ? "high" : "auto"}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>
            </a>

            <button
              type="button"
              aria-label="Download image"
              className="group absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white transition hover:border-white hover:bg-white hover:text-black"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                downloadImage(image.largeURL);
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 32 32"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Gallery;
