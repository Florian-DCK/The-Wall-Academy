import { defineRouting } from "next-intl/routing";

export const SUPPORTED_LOCALES = ["fr", "en", "nl"];
export const DEFAULT_LOCALE = "en";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: SUPPORTED_LOCALES,

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE,
});
