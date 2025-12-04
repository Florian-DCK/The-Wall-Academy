import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt } from "@/app/lib/session";
import type { SessionPayload } from "@/app/lib/definitions";
import Gallery from "@/components/Gallery";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type GalleryData = { id: number; title: string; createdAt: string };
type GalleryImage = {
  largeURL: string;
  thumbnailURL: string;
  width: number;
  height: number;
};

type GalleryPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
};

const DEFAULT_PAGE_SIZE = 20;

const parseNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isPromiseLike = <T,>(value: unknown): value is PromiseLike<T> => {
  return (
    value !== null &&
    typeof value === "object" &&
    "then" in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>).then === "function"
  );
};

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

async function getGalleryData(
  galleryId: string,
  cookieHeader?: string
): Promise<GalleryData> {
  const init: RequestInit = { cache: "no-store" };
  if (cookieHeader) {
    init.headers = { cookie: cookieHeader };
  }

  const response = await fetch(
    `${getBaseUrl()}/api/gallery?gallery=${galleryId}`,
    init
  );

  if (!response.ok) {
    throw new Error("Unable to load gallery");
  }

  const json = await response.json();
  if (!json?.data) {
    throw new Error("Gallery not found");
  }

  return json.data as GalleryData;
}

async function getGalleryImages(
  galleryId: string,
  page: number,
  cookieHeader?: string
): Promise<{ images: GalleryImage[]; pagination: GalleryPagination }> {
  const init: RequestInit = { cache: "no-store" };
  if (cookieHeader) {
    init.headers = { cookie: cookieHeader };
  }

  const response = await fetch(
    `${getBaseUrl()}/api/images?galleryId=${galleryId}&page=${page}`,
    init
  );

  if (response.status === 401 || response.status === 403) {
    redirect("/");
  }

  if (!response.ok) {
    throw new Error("Unable to load gallery images");
  }

  const json = await response.json();
  const images = Array.isArray(json?.data) ? (json.data as GalleryImage[]) : [];
  const pagination: GalleryPagination = {
    page: parseNumber(json?.pagination?.page, page),
    pageSize: parseNumber(json?.pagination?.pageSize, DEFAULT_PAGE_SIZE),
    total: parseNumber(json?.pagination?.total, images.length),
    totalPages: parseNumber(
      json?.pagination?.totalPages,
      images.length ? 1 : 0
    ),
    hasNext: Boolean(json?.pagination?.hasNext ?? false),
  };

  return { images, pagination };
}

type PageProps = {
  params: { locale: string };
  searchParams?:
    | { page?: string | string[] }
    | Promise<{ page?: string | string[] } | undefined>;
};

const buildPaginationSegments = (current: number, total: number) => {
  const delta = 1;
  const range: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  const segments: Array<number | "ellipsis"> = [];
  let previous = 0;
  for (const page of range) {
    if (previous) {
      if (page - previous === 2) {
        segments.push(previous + 1);
      } else if (page - previous > 2) {
        segments.push("ellipsis");
      }
    }
    segments.push(page);
    previous = page;
  }

  return segments;
};

export default async function Page({ params, searchParams }: PageProps) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (!sessionToken) {
    redirect("/");
  }

  const payload = (await decrypt(sessionToken)) as SessionPayload | undefined;
  const galleryId = payload?.GalleryId;
  if (!galleryId) {
    redirect("/");
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const resolvedSearchParams = isPromiseLike(searchParams)
    ? await searchParams
    : searchParams;
  const rawPage = resolvedSearchParams?.page;
  const currentPageRaw = Array.isArray(rawPage) ? rawPage[0] : rawPage ?? "1";
  const parsedPage = Number.parseInt(currentPageRaw, 10);
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [data, galleryResponse] = await Promise.all([
    getGalleryData(galleryId, cookieHeader),
    getGalleryImages(galleryId, currentPage, cookieHeader),
  ]);

  const { images, pagination } = galleryResponse;
  const totalPages = Math.max(pagination.totalPages, 1);
  const segments = buildPaginationSegments(pagination.page, totalPages);

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) {
      params.set("page", page.toString());
    }
    const query = params.toString();
    return query ? `?${query}` : `?${""}`;
  };

  const disablePrev = pagination.page <= 1;
  const disableNext = pagination.page >= totalPages;

  return (
    <main className="min-h-screen pb-24 pt-10 sm:pt-14">
      <div className="mx-auto flex w-full flex-col gap-8 px-4 py-4 sm:px-6 lg:px-16">
        <header className="border-b border-[#edbb66] pb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400 sm:text-sm">
            The Wall Academy
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {data.title}
          </h1>
        </header>
        <Gallery galleryID={galleryId} images={images} />
      </div>
      {totalPages > 1 && (
        <Pagination className="fixed bottom-4 left-0 right-0 mx-auto w-[calc(100%-2rem)] max-w-md transform rounded-full border border-white/10 bg-slate-900/90 px-2 py-2 text-slate-50 shadow-lg shadow-black/40 backdrop-blur sm:px-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={buildHref(Math.max(1, pagination.page - 1))}
                aria-disabled={disablePrev}
                tabIndex={disablePrev ? -1 : undefined}
                className={disablePrev ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {segments.map((segment, index) => (
              <PaginationItem key={`${segment}-${index}`}>
                {segment === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    className={
                      segment === pagination.page ? "text-slate-700" : ""
                    }
                    href={buildHref(segment)}
                    isActive={segment === pagination.page}
                  >
                    {segment}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={buildHref(Math.min(totalPages, pagination.page + 1))}
                aria-disabled={disableNext}
                tabIndex={disableNext ? -1 : undefined}
                className={disableNext ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </main>
  );
}
