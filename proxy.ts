import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/app/lib/session";

// next-intl middleware instance
const nextIntlMiddleware = createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

// We'll consider only the locale root (e.g. `/fr`) and `/` as public.
// All other routes will be treated as protected.

export default async function middleware(req: NextRequest) {
  // 1. Run next-intl middleware first so locale detection / redirects occur
  const maybeIntl = (
    nextIntlMiddleware as unknown as (r: NextRequest) => unknown
  )(req);
  const intlResult = (await Promise.resolve(maybeIntl)) as
    | NextResponse
    | undefined;
  const intlHandled =
    intlResult?.headers.has("x-middleware-rewrite") ||
    intlResult?.headers.has("location");
  if (intlHandled) return intlResult;

  // 2. Check if the current route is the locale root or `/` (public); otherwise protected
  const path = req.nextUrl.pathname;
  const locales = (routing as unknown as { locales?: string[] })?.locales;
  const isLocaleRoot =
    Array.isArray(locales) && locales.some((l) => path === `/${l}`);
  const isRoot = path === "/";
  const isAdminRoute =
    Array.isArray(locales) &&
    locales.some(
      (l) => path === `/${l}/admin` || path.startsWith(`/${l}/admin/`)
    );
  const isPublicRoute = isLocaleRoot || isRoot || isAdminRoute;
  const isProtectedRoute = !isPublicRoute;

  const cookie = req.cookies.get("session")?.value ?? null;
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
    return NextResponse.redirect(new URL("/", req.nextUrl));
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
