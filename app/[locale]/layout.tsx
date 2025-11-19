import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import CursorFollower from "@/components/CursorFollower";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import { ViewTransition } from "react";

const headingFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "The Wall Academy Gallery",
  description: "Gallery application for The Wall Academy camps",
};

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
    <html
      lang={locale}
      className={`${headingFont.variable} ${bodyFont.variable}`}
    >
      <body className="antialiased flex flex-col min-h-screen cursor-crosshair">
        <CursorFollower />
        <ViewTransition>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Header isConnected={false} />
            {children}
          </NextIntlClientProvider>
        </ViewTransition>
      </body>
    </html>
  );
}
