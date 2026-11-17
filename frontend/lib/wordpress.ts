import "server-only";
import { POST_TYPES, REVALIDATE_SECONDS, WORDPRESS_URL, type RestBase } from "./config";
import type { SiteSettings, WPEntry } from "./types";

/* ------------------------------------------------------------------ *
 * Cache tags
 *   wp                 → everything (nuclear option)
 *   settings           → site name, menus, front page
 *   type:<restBase>    → listings/archives of a post type
 *   <restBase>:<slug>  → a single entry
 * ------------------------------------------------------------------ */
export const tags = {
  all: "wp",
  settings: "settings",
  type: (restBase: string) => `type:${restBase}`,
  entry: (restBase: string, slug: string) => `${restBase}:${slug}`,
};

interface FetchOptions {
  params?: Record<string, string | number | undefined>;
  tags?: string[];
  /** Authenticated, uncached request — used for draft previews only. */
  preview?: boolean;
}

interface WPResponse<T> {
  data: T;
  total: number;
  totalPages: number;
}

function previewAuthHeader(): Record<string, string> {
  const user = process.env.WORDPRESS_PREVIEW_USER;
  const pass = process.env.WORDPRESS_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("WORDPRESS_PREVIEW_USER / WORDPRESS_APP_PASSWORD are required for previews");
  }
  const value = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  // X-Authorization is a fallback for hosts that strip Authorization (handled by the bridge plugin).
  return { Authorization: value, "X-Authorization": value };
}

export async function wpFetch<T>(path: string, opts: FetchOptions = {}): Promise<WPResponse<T>> {
  if (!WORDPRESS_URL) throw new Error("WORDPRESS_URL is not set");

  const url = new URL(`${WORDPRESS_URL}/wp-json${path}`);
  for (const [key, value] of Object.entries(opts.params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(opts.preview ? previewAuthHeader() : {}) },
    ...(opts.preview
      ? { cache: "no-store" as const }
      : { next: { revalidate: REVALIDATE_SECONDS, tags: [tags.all, ...(opts.tags ?? [])] } }),
  });

  if (!res.ok) {
    throw new Error(`WordPress ${res.status} ${res.statusText} for ${url.pathname}${url.search}`);
  }

  return {
    data: (await res.json()) as T,
    total: Number(res.headers.get("X-WP-Total") ?? 0),
    totalPages: Number(res.headers.get("X-WP-TotalPages") ?? 1),
  };
}

/** Params added to every entry request: formatted ACF values + featured image/author. */
const ENTRY_PARAMS = { acf_format: "standard", _embed: "wp:featuredmedia,author" };

/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<SiteSettings> {
  try {
    const { data } = await wpFetch<SiteSettings>("/headless/v1/settings", { tags: [tags.settings] });
    return { ...data, menus: data.menus ?? {} };
  } catch {
    // Keeps the site rendering if the mu-plugin isn't installed yet.
    return { name: "Site", description: "", frontPage: null, menus: {} };
  }
}

/** Single entry by slug (posts, CPTs). */
export async function getEntryBySlug(restBase: RestBase, slug: string): Promise<WPEntry | null> {
  const { data } = await wpFetch<WPEntry[]>(`/wp/v2/${restBase}`, {
    params: { slug, ...ENTRY_PARAMS },
    tags: [tags.entry(restBase, slug)],
  });
  return data[0] ?? null;
}

/**
 * Page by full path, e.g. "about/team". Slugs aren't unique across parents,
 * so we fetch by the last segment and match the full `uri`.
 */
export async function getPageByPath(path: string): Promise<WPEntry | null> {
  const clean = path.replace(/^\/|\/$/g, "");
  const slug = clean.split("/").pop() ?? "";
  if (!slug) return null;

  const { data } = await wpFetch<WPEntry[]>("/wp/v2/pages", {
    params: { slug, ...ENTRY_PARAMS },
    tags: [tags.entry("pages", slug)],
  });
  return data.find((p) => (p.uri ?? p.slug).replace(/\/$/, "") === clean) ?? null;
}

/** Paginated listing for archives. */
export async function getEntries(restBase: RestBase, page = 1, perPage = 12) {
  return wpFetch<WPEntry[]>(`/wp/v2/${restBase}`, {
    params: { page, per_page: perPage, _embed: "wp:featuredmedia" },
    tags: [tags.type(restBase)],
  });
}

/** Every published entry (lightweight fields) — for generateStaticParams and the sitemap. */
export async function getAllEntries(restBase: RestBase) {
  const fields = "id,slug,uri,modified,link";
  const all: Pick<WPEntry, "id" | "slug" | "uri" | "modified" | "link">[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await wpFetch<WPEntry[]>(`/wp/v2/${restBase}`, {
      params: { page, per_page: 100, _fields: fields },
      tags: [tags.type(restBase)],
    });
    all.push(...res.data);
    totalPages = res.totalPages;
    page++;
  } while (page <= totalPages);
  return all;
}

/**
 * Draft/preview content by ID. Uses the Application Password and, for
 * already-published entries, prefers the newest autosave (that's what
 * the editor is looking at when they hit "Preview").
 */
export async function getPreviewEntry(restBase: RestBase, id: number): Promise<WPEntry | null> {
  try {
    const { data: entry } = await wpFetch<WPEntry>(`/wp/v2/${restBase}/${id}`, {
      params: { ...ENTRY_PARAMS, context: "edit" },
      preview: true,
    });

    try {
      const { data: autosaves } = await wpFetch<WPEntry[]>(`/wp/v2/${restBase}/${id}/autosaves`, {
        params: { context: "edit" },
        preview: true,
      });
      const latest = autosaves[0];
      if (latest && new Date(latest.modified) > new Date(entry.modified)) {
        return { ...entry, title: latest.title, content: latest.content, excerpt: latest.excerpt };
      }
    } catch {
      /* no autosaves — fine */
    }
    return entry;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */

/** Frontend path for an entry. */
export function entryPath(restBase: RestBase, entry: Pick<WPEntry, "slug" | "uri">, frontPage?: string | null) {
  if (restBase === "pages") {
    const uri = (entry.uri ?? entry.slug).replace(/^\/|\/$/g, "");
    return frontPage && uri === frontPage ? "/" : `/${uri}`;
  }
  return `${POST_TYPES[restBase].route}/${entry.slug}`;
}

export function featuredImage(entry: WPEntry) {
  const media = entry._embedded?.["wp:featuredmedia"]?.[0];
  if (!media?.source_url) return null;
  return {
    url: media.source_url,
    alt: media.alt_text ?? "",
    width: media.media_details?.width ?? 1600,
    height: media.media_details?.height ?? 900,
  };
}

/** ACF returns `[]` when a post has no fields — normalise to the sections array. */
export function flexibleSections(entry: WPEntry) {
  const acf = entry.acf;
  if (!acf || Array.isArray(acf)) return [];
  return Array.isArray(acf.sections) ? acf.sections : [];
}

/** Rewrites absolute WordPress URLs in rendered HTML to frontend-relative links. */
export function rewriteLinks(html: string) {
  if (!WORDPRESS_URL) return html;
  const escaped = WORDPRESS_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Leave /wp-content/ (media) on the WP host, rewrite everything else.
  return html.replace(new RegExp(`href="${escaped}(?!/wp-content/)`, "g"), 'href="');
}

export function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8230;|\[&hellip;\]|&hellip;/g, "…")
    .trim();
}
