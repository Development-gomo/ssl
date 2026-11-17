// src/lib/api.js
// All WordPress REST calls. Server-side only, except fetchWP which also works in the
// browser through the /api/content proxy.

import { DEFAULT_LANG, SUPPORTED_LANGS, WP_BASE, ROUTE_TYPES, entryHref, langHome, langHref } from "@/config";
import { cache } from "react";
import { maskWp } from "@/lib/wpMask";

// Deduped fetch: React.cache ensures identical calls within the same
// server render are only executed once (works across page + generateMetadata).
// Responses are masked so no CMS URL reaches the browser (see lib/wpMask.js).
// Staging/dev: set WP_REVALIDATE_SECONDS=0 in the Vercel env to bypass the ISR cache for every WP fetch.
// Production: leave it unset — WordPress calls /api/revalidate on every save (bridge plugin).
const REVALIDATE_OVERRIDE = process.env.WP_REVALIDATE_SECONDS;
const revalidateFor = (seconds) => {
  const n = REVALIDATE_OVERRIDE === undefined || REVALIDATE_OVERRIDE === "" ? NaN : Number(REVALIDATE_OVERRIDE);
  return Number.isFinite(n) && n >= 0 ? n : seconds;
};

// SiteGround caches /wp-json responses; its own bypass cookie makes sure a revalidation
// right after a save never re-caches stale content. Next.js does the caching itself.
const WP_HEADERS = { Accept: "application/json", Cookie: "wpSGCacheBypass=1" };

/** Basic auth for an Application Password user (WP_API_USER / WP_API_PASS). */
export function wpAuthHeaders() {
  const user = process.env.WP_API_USER || process.env.WORDPRESS_PREVIEW_USER;
  const pass = process.env.WP_API_PASS || process.env.WORDPRESS_APP_PASSWORD;
  if (!user || !pass) return {};
  const value = `Basic ${btoa(`${user}:${pass}`)}`;
  // X-Authorization: SiteGround strips Authorization; the bridge plugin reads either
  return { Authorization: value, "X-Authorization": value };
}

// A non-JSON answer (SiteGround anti-bot / maintenance page) is retried once uncached,
// so a one-off HTML response never ends up as a cached "not found".
async function readJson(url, init) {
  const res = await fetch(url, init);
  const isJson = (res.headers.get("content-type") || "").includes("json");
  if (isJson) return { res, data: await res.json() };
  const retry = await fetch(url, { headers: init.headers, cache: "no-store" });
  const retryJson = (retry.headers.get("content-type") || "").includes("json");
  return { res: retry, data: retryJson ? await retry.json() : null };
}

const _fetchWP = cache(async function _fetchWP(url, revalidate) {
  try {
    const { res, data } = await readJson(url, { headers: WP_HEADERS, next: { revalidate: revalidateFor(revalidate) } });
    if (!res.ok || data === null) return null;
    return maskWp(data);
  } catch {
    return null;
  }
});

// Generic fetch helper with ISR revalidation (60s by default).
export function fetchWP(endpoint, { revalidate = 60 } = {}) {
  const url = `${WP_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  return _fetchWP(url, revalidate);
}

// Same as fetchWP, plus the X-WP-Total / X-WP-TotalPages paging headers (listings).
const _fetchWPPaged = cache(async function _fetchWPPaged(url, revalidate) {
  try {
    const { res, data } = await readJson(url, { headers: WP_HEADERS, next: { revalidate: revalidateFor(revalidate) } });
    if (!res.ok || data === null) return { items: [], total: 0, totalPages: 0 };
    const items = maskWp(data);
    return {
      items: Array.isArray(items) ? items : [],
      total: Number(res.headers.get("x-wp-total") || 0),
      totalPages: Number(res.headers.get("x-wp-totalpages") || 0),
    };
  } catch {
    return { items: [], total: 0, totalPages: 0 };
  }
});

// Uncached, authenticated fetch — draft previews only.
async function fetchWPAuth(endpoint) {
  try {
    const res = await fetch(`${WP_BASE}${endpoint}`, { headers: { ...WP_HEADERS, ...wpAuthHeaders() }, cache: "no-store" });
    if (!res.ok) return null;
    return maskWp(await res.json());
  } catch {
    return null;
  }
}

// ─── Site settings (bridge plugin: /headless/v1/settings?lang=) ───────────────
// { name, description, lang, languages, frontPage, menus: { primary: [...], footer: [...] } }
// Per language: WPML returns that language's menus, translated front page and site title.
export async function getSiteSettings(lang = DEFAULT_LANG) {
  const settings = await fetchWP(`/headless/v1/settings?lang=${lang}`, { revalidate: 300 });
  return {
    name: settings?.name || "SSL",
    description: settings?.description || "",
    frontPage: settings?.frontPage || null,
    languages: Array.isArray(settings?.languages) ? settings.languages : [],
    menus: settings?.menus && !Array.isArray(settings.menus) ? settings.menus : {},
  };
}

// ─── Pages ────────────────────────────────────────────────────────────────────
// acf_format=standard: images and links come back as full objects, not IDs
const ENTRY_QUERY = "&acf_format=standard&_embed=wp:featuredmedia,author";

async function getSingleEntry(endpoint, slug, lang = DEFAULT_LANG, query = ENTRY_QUERY) {
  if (!slug) return null;
  const entries = await fetchWP(`/wp/v2/${endpoint}?slug=${encodeURIComponent(slug)}&lang=${lang}${query}`);
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries.find((entry) => entry.lang === lang) || entries.find((entry) => entry.slug === slug) || entries[0];
}

export async function getPageBySlug(slug, lang = DEFAULT_LANG) {
  return getSingleEntry("pages", slug, lang);
}

/** The page set under Settings → Reading → "A static page" (null when the front page shows posts). */
export async function getFrontPage(lang = DEFAULT_LANG) {
  const { frontPage } = await getSiteSettings(lang);
  return frontPage ? getPageBySlug(frontPage, lang) : null;
}

// Child page by its full path (["about", "team"]): the bridge plugin adds `uri`
// ("about/team") to every page, so the last segment's candidates are matched on it.
export async function getPageByPath(segments, lang = DEFAULT_LANG) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const candidates = await fetchWP(`/wp/v2/pages?slug=${encodeURIComponent(segments.at(-1))}&lang=${lang}${ENTRY_QUERY}`);
  if (!Array.isArray(candidates)) return null;
  const path = segments.join("/");
  return candidates.find((page) => (page.uri || page.slug).replace(/^\/|\/$/g, "") === path) || null;
}

// ─── Posts & custom post types (ROUTE_TYPES in src/config) ────────────────────
export async function getEntryBySlug(type, slug, lang = DEFAULT_LANG) {
  const rest = ROUTE_TYPES[type]?.rest;
  return rest ? getSingleEntry(rest, slug, lang) : null;
}

export async function getPostBySlug(slug, lang = DEFAULT_LANG) {
  const post = await getEntryBySlug("post", slug, lang);

  if (post) {
    // Up to 3 related posts for PostCard: same category first, topped up with the latest.
    const RELATED = 3;
    const cardFields = "&_embed=wp:featuredmedia&_fields=id,slug,date,title,excerpt,_links,_embedded";
    const categoryIds = Array.isArray(post.categories) && post.categories.length > 0 ? post.categories.join(",") : null;
    const sameCategory = categoryIds
      ? await fetchWP(`/wp/v2/posts?exclude=${post.id}&per_page=${RELATED}&lang=${lang}&categories=${categoryIds}${cardFields}`)
      : [];
    let related = Array.isArray(sameCategory) ? sameCategory : [];
    if (related.length < RELATED) {
      const exclude = [post.id, ...related.map((p) => p.id)].join(",");
      const latest = await fetchWP(`/wp/v2/posts?exclude=${exclude}&per_page=${RELATED - related.length}&lang=${lang}${cardFields}`);
      if (Array.isArray(latest)) related = [...related, ...latest];
    }
    post.relatedPosts = related;
  }

  return post;
}

/** One page of a type's listing (blog, projects …) with paging totals. */
export function getEntriesPage(type, page = 1, perPage = 12, lang = DEFAULT_LANG) {
  const rest = ROUTE_TYPES[type]?.rest || type;
  const url = `${WP_BASE}/wp/v2/${rest}?page=${page}&per_page=${perPage}&lang=${lang}&_embed=wp:featuredmedia&_fields=id,slug,date,title,excerpt,_links,_embedded`;
  return _fetchWPPaged(url, 60);
}

/** Every published entry of a REST base (slugs for generateStaticParams and the sitemap). */
export async function getAllEntriesByType(endpoint, lang = DEFAULT_LANG) {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${WP_BASE}/wp/v2/${endpoint}?per_page=100&page=${page}&lang=${lang}&_fields=id,slug,uri,parent,modified,date,meta,lang`;
    const { items, totalPages } = await _fetchWPPaged(url, 300);
    all.push(...items);
    if (page >= totalPages) break;
  }
  return all;
}

export async function getMediaById(id) {
  if (!id) return null;
  return fetchWP(`/wp/v2/media/${id}`);
}

// ─── Language alternates (switcher + hreflang) ────────────────────────────────
// Site path of the same content in every language: { sv: "/blogg/hej", en: "/en/blog/hello" }.
// kind: "home" | "archive" | "page" | a ROUTE_TYPES key ("post", "project" …).
// Languages without a published translation are left out (the switcher then links to that
// language's home page). Uses the bridge plugin's `translations` field (WPML).
export async function getAlternates({ kind, entry = null, type = null }) {
  if (kind === "home") {
    return Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, langHome(l)]));
  }
  if (kind === "archive") {
    return Object.fromEntries(
      SUPPORTED_LANGS.filter((l) => ROUTE_TYPES[type]?.base[l]).map((l) => [l, langHref(`/${ROUTE_TYPES[type].base[l]}`, l)]),
    );
  }

  const translations = entry?.translations && !Array.isArray(entry.translations) ? entry.translations : {};
  const out = {};

  if (kind === "page") {
    const settings = await Promise.all(SUPPORTED_LANGS.map((l) => getSiteSettings(l)));
    SUPPORTED_LANGS.forEach((l, i) => {
      const t = translations[l] || (entry?.lang === l || (!entry?.lang && l === DEFAULT_LANG) ? { slug: entry?.slug, uri: entry?.uri } : null);
      if (!t?.slug) return;
      const uri = (t.uri || t.slug).replace(/^\/|\/$/g, "");
      out[l] = uri === settings[i].frontPage ? langHome(l) : langHref(`/${uri}`, l);
    });
    return out;
  }

  for (const l of SUPPORTED_LANGS) {
    const t = translations[l] || (entry?.lang === l || (!entry?.lang && l === DEFAULT_LANG) ? { slug: entry?.slug } : null);
    if (t?.slug) out[l] = entryHref(kind, t.slug, l);
  }
  return out;
}

// ─── Draft preview (/api/preview → /preview/[type]/[id]) ──────────────────────
// Reads the draft with the Application Password; for published entries the newest
// autosave wins, since that's what the editor sees when they hit "Preview".
export async function getPreviewEntry(rest, id) {
  const entry = await fetchWPAuth(`/wp/v2/${rest}/${id}?context=edit${ENTRY_QUERY}`);
  if (!entry || entry.code) return null;
  const autosaves = await fetchWPAuth(`/wp/v2/${rest}/${id}/autosaves?context=edit`);
  const latest = Array.isArray(autosaves) ? autosaves[0] : null;
  if (latest && new Date(latest.modified) > new Date(entry.modified)) {
    return { ...entry, title: latest.title, content: latest.content, excerpt: latest.excerpt };
  }
  return entry;
}
