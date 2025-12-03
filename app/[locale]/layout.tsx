import type { Metadata } from "next";
import "./home.css";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import CursorFollower from "@/components/CursorFollower";
import { ViewTransition } from "react";

const SITE_NAME = "The Wall Academy";
const metadataBase =
  process.env.NEXT_PUBLIC_SITE_URL &&
  process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined;

const defaultDescription = "Website for The Wall Academy of Vincent Vanasch";

const localeMeta: Record<
  string,
  { description: string; keywords: string[]; localeName: string }
> = {
  en: {
    description: defaultDescription,
    keywords: [
      "The Wall Academy",
      "Vincent Vanasch",
      "goalkeeper academy",
      "hockey training",
      "goalkeeper coaching",
      "field hockey camps",
      "elite goalkeeper program",
      "hockey goalkeeper lessons",
    ],
    localeName: "English",
  },
  fr: {
    description: "Site de The Wall Academy de Vincent Vanasch",
    keywords: [
      "The Wall Academy",
      "Vincent Vanasch",
      "académie gardien",
      "entrainement hockey",
      "coaching gardien",
      "stages de hockey",
      "formation gardien de but hockey",
      "programme élite gardien",
      "entrainement gardien hockey",
      "camp hockey gardien",
      "formation gardien hockey sur gazon",
      "coaching personnalisé gardien",
    ],
    localeName: "Français",
  },
  nl: {
    description: "Website van The Wall Academy van Vincent Vanasch",
    keywords: [
      "The Wall Academy",
      "Vincent Vanasch",
      "keeper academie",
      "hockey training",
      "keeper coaching",
      "hockey stages",
      "keeper clinics",
      "hockey doelman opleidingen",
      "keeperschool",
      "hockey doelman training",
      "keeper kamp",
      "persoonlijke keeper coaching",
    ],
    localeName: "Nederlands",
  },
};

const languageAlternates = routing.locales.reduce(
  (acc, locale) => ({ ...acc, [locale]: `/${locale}` }),
  {} as Record<string, string>
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const { description, keywords, localeName } =
    localeMeta[locale] ?? localeMeta[routing.defaultLocale];
  const canonicalPath = locale === routing.defaultLocale ? "/" : `/${locale}`;

  return {
    ...(metadataBase ? { metadataBase } : {}),
    applicationName: SITE_NAME,
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    keywords,
    authors: [{ name: SITE_NAME }, { name: "Vincent Vanasch" }],
    creator: "The Wall Academy",
    publisher: "The Wall Academy",
    category: "Sports",
    abstract: defaultDescription,
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    openGraph: {
      title: SITE_NAME,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale,
      alternateLocale: routing.locales.filter(
        (availableLocale) => availableLocale !== locale
      ),
      type: "website",
      images: [
        {
          url: "/brandLogo.png",
          width: 800,
          height: 800,
          alt: "The Wall Academy logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description,
      images: [
        {
          url: "/brandLogo.png",
          alt: "The Wall Academy logo",
        },
      ],
      creator: "@thewallacademy",
      site: "@thewallacademy",
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/brandLogo.png", sizes: "800x800", type: "image/png" },
      ],
      apple: "/brandLogo.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        maxImagePreview: "large",
        maxVideoPreview: -1,
        maxSnippet: -1,
      },
    },
    formatDetection: {
      telephone: false,
      address: false,
      email: false,
    },
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    other: {
      "og:locale:language": localeName,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Charge les messages de traduction pour la locale demandée.
  let messages: Record<string, unknown> | undefined;
  try {
    // Le chemin relatif depuis `app/[locale]/layout.tsx` vers `messages/{locale}.json`
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // Si les messages ne sont pas trouvés, afficher 404 (ou gérer autrement)
    notFound();
  }

  return (
    <html lang={locale} className={`font-body`}>
      <body className="antialiased flex flex-col min-h-screen cursor-crosshair text-white font-body">
        <CursorFollower />
        <ViewTransition>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ViewTransition>
      </body>
    </html>
  );
}
