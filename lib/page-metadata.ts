import type { Metadata } from "next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/i18n/routing";
import { resolveSiteUrlOrLocalhost } from "@/lib/site-url";

type LocaleCode = (typeof SUPPORTED_LOCALES)[number];
type PageKey = "home" | "about" | "gallery" | "galleryView" | "admin";
type PageCopy = {
  title: string;
  description: string;
};

const SITE_NAME = "The Wall Academy";
const metadataBase = resolveSiteUrlOrLocalhost();
const SITE_NAME_BY_LOCALE: Record<LocaleCode, string> = {
  en: "The Wall Academy - Hockey Camps",
  fr: "The Wall Academy - Stages de hockey",
  nl: "The Wall Academy - Hockeystages",
};

const PAGE_COPY: Record<PageKey, Record<LocaleCode, PageCopy>> = {
  home: {
    en: {
      title: "Home | The Wall Academy",
      description:
        "Elite goalkeeper training with Vincent Vanasch. Camps, coaching and high-performance sessions.",
    },
    fr: {
      title: "Accueil | The Wall Academy",
      description:
        "Entrainement elite des gardiens avec Vincent Vanasch. Stages, coaching et sessions de haut niveau.",
    },
    nl: {
      title: "Home | The Wall Academy",
      description:
        "Elite keeperstraining met Vincent Vanasch. Camps, coaching en high-performance sessies.",
    },
  },
  about: {
    en: {
      title: "About | The Wall Academy",
      description:
        "Discover Vincent Vanasch's journey, achievements and vision for goalkeeper development.",
    },
    fr: {
      title: "A propos | The Wall Academy",
      description:
        "Decouvrez le parcours, le palmares et la vision de Vincent Vanasch pour former les gardiens.",
    },
    nl: {
      title: "Over | The Wall Academy",
      description:
        "Ontdek het parcours, de titels en de visie van Vincent Vanasch voor keeperontwikkeling.",
    },
  },
  gallery: {
    en: {
      title: "Gallery Access | The Wall Academy",
      description:
        "Access private camp galleries and browse iconic moments from The Wall Academy.",
    },
    fr: {
      title: "Acces Galerie | The Wall Academy",
      description:
        "Accedez aux galeries privees des stages et revivez les moments iconiques de The Wall Academy.",
    },
    nl: {
      title: "Galerij Toegang | The Wall Academy",
      description:
        "Krijg toegang tot private camp-galerijen en bekijk iconische momenten van The Wall Academy.",
    },
  },
  galleryView: {
    en: {
      title: "Private Gallery | The Wall Academy",
      description:
        "Private image gallery for camp participants of The Wall Academy.",
    },
    fr: {
      title: "Galerie Privee | The Wall Academy",
      description:
        "Galerie photo privee reservee aux participants des stages The Wall Academy.",
    },
    nl: {
      title: "Privegalerij | The Wall Academy",
      description:
        "Prive fotogalerij voor deelnemers van de stages van The Wall Academy.",
    },
  },
  admin: {
    en: {
      title: "Admin | The Wall Academy",
      description:
        "Administration dashboard for translations, galleries and content management.",
    },
    fr: {
      title: "Admin | The Wall Academy",
      description:
        "Tableau de bord d'administration pour gerer traductions, galeries et contenus.",
    },
    nl: {
      title: "Admin | The Wall Academy",
      description:
        "Beheer-dashboard voor vertalingen, galerijen en contentbeheer.",
    },
  },
};

const PAGE_PATH: Record<PageKey, string> = {
  home: "/",
  about: "/about",
  gallery: "/gallery",
  galleryView: "/gallery/view",
  admin: "/admin",
};

function toLocalizedPath(locale: LocaleCode, basePath: string): string {
  if (basePath === "/") {
    return `/${locale}`;
  }

  return `/${locale}${basePath}`;
}

function toUrl(path: string): string {
  return new URL(path, metadataBase).toString();
}

function normalizeLocale(locale: string): LocaleCode {
  return SUPPORTED_LOCALES.includes(locale as LocaleCode)
    ? (locale as LocaleCode)
    : (DEFAULT_LOCALE as LocaleCode);
}

export function buildPageMetadata(
  locale: string,
  page: PageKey,
  options?: { noIndex?: boolean }
): Metadata {
  const resolvedLocale = normalizeLocale(locale);
  const copy = PAGE_COPY[page][resolvedLocale];
  const localizedSiteName = SITE_NAME_BY_LOCALE[resolvedLocale];
  const localizedTitle = copy.title.replace(SITE_NAME, localizedSiteName);
  const canonicalPath = toLocalizedPath(resolvedLocale, PAGE_PATH[page]);

  const languages = SUPPORTED_LOCALES.reduce<Record<string, string>>(
    (accumulator, availableLocale) => {
      accumulator[availableLocale] = toUrl(
        toLocalizedPath(availableLocale, PAGE_PATH[page])
      );
      return accumulator;
    },
    {}
  );

  return {
    metadataBase,
    title: localizedTitle,
    description: copy.description,
    applicationName: SITE_NAME,
    alternates: {
      canonical: toUrl(canonicalPath),
      languages,
    },
    openGraph: {
      title: localizedTitle,
      description: copy.description,
      url: toUrl(canonicalPath),
      siteName: SITE_NAME,
      locale: resolvedLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: localizedTitle,
      description: copy.description,
    },
    robots: options?.noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}
