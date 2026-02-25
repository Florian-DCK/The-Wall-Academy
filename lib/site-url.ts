const parseUrl = (value?: string | null): URL | undefined => {
  if (!value) {
    return undefined;
  }

  const raw = value.trim();
  if (!raw) {
    return undefined;
  }

  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return undefined;
    }
  }
};

export const resolveSiteUrlFromEnv = (): URL | undefined => {
  return (
    parseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    parseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    (process.env.VERCEL_URL
      ? parseUrl(`https://${process.env.VERCEL_URL}`)
      : undefined)
  );
};

export const resolveSiteUrlOrLocalhost = (): URL => {
  return resolveSiteUrlFromEnv() ?? new URL("http://localhost:3000");
};
