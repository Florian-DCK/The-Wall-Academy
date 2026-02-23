import type { Metadata } from 'next';
import './home.css';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import CursorFollower from '@/components/CursorFollower';
import EventBanner from '@/components/EventBanner';

const SITE_NAME = 'The Wall Academy';
const envMetadataBase =
	process.env.NEXT_PUBLIC_SITE_URL &&
	process.env.NEXT_PUBLIC_SITE_URL.startsWith('http')
		? new URL(process.env.NEXT_PUBLIC_SITE_URL)
		: undefined;

const defaultDescription = 'Website for The Wall Academy of Vincent Vanasch';

const resolveMetadataBase = async () => {
	if (envMetadataBase) {
		return envMetadataBase;
	}

	const requestHeaders = await headers();
	const host =
		requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
	const proto = requestHeaders.get('x-forwarded-proto') ?? 'http';

	if (host) {
		return new URL(`${proto}://${host}`);
	}

	return new URL('http://localhost:3000');
};

const localeMeta: Record<
	string,
	{ description: string; keywords: string[]; localeName: string }
> = {
	en: {
		description: defaultDescription,
		keywords: [
			'The Wall Academy',
			'Vincent Vanasch',
			'goalkeeper academy',
			'hockey training',
			'Belgium',
			'Brussels',
			'stage',
		],
		localeName: 'English',
	},
	fr: {
		description: 'Site de The Wall Academy de Vincent Vanasch',
		keywords: [
			'The Wall Academy',
			'Vincent Vanasch',
			'academie gardien',
			'hockey gardien',
			'Belgique',
			'Bruxelles',
			'stage',
		],
		localeName: 'Francais',
	},
	nl: {
		description: 'Website van The Wall Academy van Vincent Vanasch',
		keywords: [
			'The Wall Academy',
			'Vincent Vanasch',
			'keeper academie',
			'hockey training',
			'Belgie',
			'Brussel',
			'stage',
		],
		localeName: 'Nederlands',
	},
};

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
	const metadataBase = await resolveMetadataBase();
	const canonicalPath = `/${locale}`;
	const absoluteCanonicalUrl = new URL(canonicalPath, metadataBase).toString();

	const languages = routing.locales.reduce((acc, loc) => {
		const path = `/${loc}`;
		acc[loc] = new URL(path, metadataBase).toString();
		return acc;
	}, {} as Record<string, string>);

	return {
		metadataBase,
		applicationName: SITE_NAME,
		title: {
			default: SITE_NAME,
			template: `%s | ${SITE_NAME}`,
		},
		description,
		keywords,
		authors: [{ name: SITE_NAME }, { name: 'Vincent Vanasch' }],
		creator: 'Hilarious Agency',
		publisher: 'Hilarious Agency',
		category: 'Sports',
		abstract: defaultDescription,
		alternates: {
			canonical: absoluteCanonicalUrl,
			languages,
		},
		openGraph: {
			title: SITE_NAME,
			description,
			url: absoluteCanonicalUrl,
			siteName: SITE_NAME,
			locale,
			alternateLocale: routing.locales.filter(
				(availableLocale) => availableLocale !== locale
			),
			type: 'website',
			images: [
				{
					url: new URL('/brandLogo.png', metadataBase).toString(),
					width: 800,
					height: 800,
					alt: 'The Wall Academy logo',
				},
			],
		},
		twitter: {
			card: 'summary_large_image',
			title: SITE_NAME,
			description,
			images: [
				{
					url: new URL('/brandLogo.png', metadataBase).toString(),
					alt: 'The Wall Academy logo',
				},
			],
			creator: '@thewallacademy',
			site: '@thewallacademy',
		},
		icons: {
			icon: [
				{ url: new URL('/favicon.ico', metadataBase).toString() },
				{
					url: new URL('/brandLogo.png', metadataBase).toString(),
					sizes: '800x800',
					type: 'image/png',
				},
			],
			apple: new URL('/brandLogo.png', metadataBase).toString(),
		},
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				'max-image-preview': 'large',
				'max-video-preview': -1,
				'max-snippet': -1,
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
			statusBarStyle: 'default',
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

	const metadataBase = await resolveMetadataBase();

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
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							'@context': 'https://schema.org',
							'@type': 'Organization',
							name: 'The Wall Academy',
							url: metadataBase.toString(),
							logo: new URL('/brandLogo.png', metadataBase).toString(),
							founder: 'Vincent Vanasch',
						}),
					}}
				/>
			</head>
			<body className="antialiased flex flex-col min-h-screen cursor-crosshair text-white font-body">
				<CursorFollower />
				<NextIntlClientProvider locale={locale} messages={messages}>
					{children}
					<EventBanner />
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
