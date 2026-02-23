import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/app/lib/session';

// next-intl middleware instance
const nextIntlMiddleware = createMiddleware(routing);

const COUNTRY_TO_LOCALE: Record<string, string> = {
	BE: 'fr',
};

function isSupportedLocale(value: string | undefined): value is string {
	return (
		typeof value === 'string' &&
		Array.isArray(routing.locales) &&
		routing.locales.includes(value)
	);
}

function pickLocaleFromAcceptLanguage(headerValue: string | null): string | null {
	if (!headerValue || !Array.isArray(routing.locales)) return null;

	const supported = new Set(routing.locales);
	const ranked = headerValue
		.split(',')
		.map((part) => {
			const [tagPart, ...params] = part.trim().split(';');
			const qParam = params.find((param) => param.trim().startsWith('q='));
			const q = qParam ? Number.parseFloat(qParam.split('=')[1]) : 1;
			return { tag: tagPart.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
		})
		.filter((item) => item.tag.length > 0)
		.sort((a, b) => b.q - a.q);

	for (const item of ranked) {
		const base = item.tag.split('-')[0];
		if (supported.has(base)) return base;
	}

	return null;
}

function detectLocale(req: NextRequest): string {
	const localeCookie = req.cookies.get('NEXT_LOCALE')?.value;
	if (isSupportedLocale(localeCookie)) return localeCookie;

	const fromAcceptLanguage = pickLocaleFromAcceptLanguage(
		req.headers.get('accept-language')
	);
	if (fromAcceptLanguage) return fromAcceptLanguage;

	const country = req.headers.get('x-vercel-ip-country')?.toUpperCase();
	const fromCountry = country ? COUNTRY_TO_LOCALE[country] : undefined;
	if (isSupportedLocale(fromCountry)) return fromCountry;

	return routing.defaultLocale;
}

export const config = {
	// Match all pathnames except for
	// - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
	// - … the ones containing a dot (e.g. `favicon.ico`)
	matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};

// We'll consider only the locale root (e.g. `/fr`), `/`, and the gallery entry
// pages as public. All other routes will be treated as protected.

export default async function middleware(req: NextRequest) {
	const path = req.nextUrl.pathname;
	const isUnprefixedEntry = path === '/' || path === '/about' || path === '/about/';

	if (isUnprefixedEntry) {
		const locale = detectLocale(req);
		const target = path.startsWith('/about') ? `/${locale}/about` : `/${locale}`;
		return NextResponse.redirect(new URL(target, req.nextUrl));
	}

	// 1. Run next-intl middleware first so locale detection / redirects occur
	const maybeIntl = (
		nextIntlMiddleware as unknown as (r: NextRequest) => unknown
	)(req);
	const intlResult = (await Promise.resolve(maybeIntl)) as
		| NextResponse
		| undefined;
	const intlHandled =
		intlResult?.headers.has('x-middleware-rewrite') ||
		intlResult?.headers.has('location');
	if (intlHandled) return intlResult;

	// 2. Check if the current route is the locale root or `/` (public); otherwise protected
	const locales = (routing as unknown as { locales?: string[] })?.locales;
	const isLocaleRoot =
		Array.isArray(locales) && locales.some((l) => path === `/${l}`);
	const isRoot = path === '/';
	const isAdminRoute =
		Array.isArray(locales) &&
		locales.some(
			(l) => path === `/${l}/admin` || path.startsWith(`/${l}/admin/`)
		);
	const isGalleryLanding =
		Array.isArray(locales) &&
		locales.some((l) => path === `/${l}/gallery` || path === `/${l}/gallery/`);
	const isAboutPage =
		Array.isArray(locales) &&
		locales.some((l) => path === `/${l}/about` || path === `/${l}/about/`);
	const isPublicRoute =
		isLocaleRoot || isRoot || isAdminRoute || isGalleryLanding || isAboutPage;
	const isProtectedRoute = !isPublicRoute;

	const cookie = req.cookies.get('session')?.value ?? null;
	const session = cookie ? await decrypt(cookie) : null;
	const hasSession = Boolean(session?.GalleryId);

	if (isProtectedRoute && !hasSession) {
		const matchedLocale = Array.isArray(locales)
			? locales.find((l) => path === `/${l}` || path.startsWith(`/${l}/`))
			: undefined;

		if (matchedLocale) {
			return NextResponse.redirect(new URL(`/${matchedLocale}`, req.nextUrl));
		}

		// Fallback: redirect to site root
		return NextResponse.redirect(new URL('/', req.nextUrl));
	}

	// if (
	// 	isPublicRoute &&
	// 	session?.GalleryId &&
	// 	!req.nextUrl.pathname.startsWith(`/${session.GalleryId}`)
	// ) {
	// 	return NextResponse.redirect(new URL(`/${session.GalleryId}`, req.nextUrl));
	// }

	return intlResult ?? NextResponse.next();
}
