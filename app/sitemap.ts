import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/i18n/routing";
import { resolveSiteUrlOrLocalhost } from "@/lib/site-url";

const INDEXED_PATHS = ["", "/about", "/gallery"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrlOrLocalhost();
  const lastModified = new Date();

  return SUPPORTED_LOCALES.flatMap((locale) =>
    INDEXED_PATHS.map((path) => {
      const localizedPath = path ? `/${locale}${path}` : `/${locale}`;
      return {
        url: new URL(localizedPath, siteUrl).toString(),
        lastModified,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1 : 0.8,
      };
    })
  );
}
