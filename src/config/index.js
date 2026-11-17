// src/config/index.js

// Fallback to "sv" so a missing env var on the host can't produce "/undefined" routes.
// Must be the WPML default language (Swedish): it has no URL prefix, English lives under /en.
export const DEFAULT_LANG = process.env.NEXT_PUBLIC_DEFAULT_LANG || "sv";

// WP REST root, e.g. https://gomostaging.com/ssl/wp-json. In the browser it is the same-origin
// proxy (src/app/api/content), so the CMS host never appears client-side.
// WORDPRESS_URL (site URL without /wp-json) is still accepted as the older variable name.
const SERVER_WP_BASE =
  process.env.NEXT_PUBLIC_WP_BASE ||
  (process.env.WORDPRESS_URL ? `${process.env.WORDPRESS_URL.replace(/\/$/, "")}/wp-json` : "");
export const WP_BASE = typeof window === "undefined" ? SERVER_WP_BASE : "/api/content";

// ─── Add new languages here — everything else updates automatically ───────────
// Codes must match the WPML language codes in WordPress.
export const SUPPORTED_LANGS = ["sv", "en"];

// Locale map for OG/SEO tags
export const LOCALE_MAP = {
  sv: "sv_SE",
  en: "en_US",
};

// Labels for the language switcher
export const LANG_LABELS = {
  sv: { short: "SV", name: "Svenska" },
  en: { short: "EN", name: "English" },
};

// ─── URL bases per content type ───────────────────────────────────────────────
// key = internal type, rest = WP REST base, base = per-language path segment.
// A new CPT: register it in WP with show_in_rest, add it here, add a template.
// Keep the bases identical to the current live site so existing URLs keep working.
export const ROUTE_TYPES = {
  post: { rest: "posts", base: { sv: "blogg", en: "blog" }, label: { sv: "Blogg", en: "Blog" } },
  project: { rest: "projects", base: { sv: "projekt", en: "projects" }, label: { sv: "Projekt", en: "Projects" } },
};

/** Internal type for a WP REST base ("posts" → "post"), or null */
export function typeFromRest(rest) {
  return Object.keys(ROUTE_TYPES).find((type) => ROUTE_TYPES[type].rest === rest) || null;
}

/** Localized URL of a single entry, e.g. entryHref("post", "my-slug", "en") → "/blog/my-slug" */
export function entryHref(type, slug, lang = DEFAULT_LANG) {
  const base = ROUTE_TYPES[type]?.base[lang] || ROUTE_TYPES[type]?.base[DEFAULT_LANG];
  if (!base || !slug) return langHome(lang);
  return langHref(`/${base}/${slug}`, lang);
}

/** Content type for a URL base in a language ("blog", "en" → "post"), or null */
export function typeFromBase(base, lang = DEFAULT_LANG) {
  return Object.keys(ROUTE_TYPES).find((type) => ROUTE_TYPES[type].base[lang] === base) || null;
}

// <body> class per content type (see pageTypeFromPath)
export const BODY_CLASS = {
  post: "article",
  project: "project",
};

/**
 * Page type for a URL path, used as the <body> class:
 * "/" → "home", "/blog/x" → "article", "/blog" → "archive", "/about" → "page".
 */
export function pageTypeFromPath(pathname) {
  const segments = (pathname || "").split("/").filter(Boolean);
  const lang = SUPPORTED_LANGS.includes(segments[0]) ? segments.shift() : DEFAULT_LANG;
  if (segments.length === 0) return "home";
  const type = typeFromBase(segments[0], lang);
  if (type && segments.length === 1) return "archive";
  if (type && segments.length === 2) return BODY_CLASS[type] || type;
  return "page";
}

/** Every class pageTypeFromPath can return (to swap the body class on client navigation) */
export const PAGE_TYPES = ["home", "page", "archive", ...Object.values(BODY_CLASS)];

/** Prefix a local path with the current language (skip prefix for default lang, and for
 *  paths that already carry a language prefix — WPML menu URLs come as "/en/…") */
export function langHref(url, lang) {
  if (!url || !url.startsWith("/") || lang === DEFAULT_LANG) return url || "/";
  const first = url.split(/[/?#]/)[1] || "";
  if (SUPPORTED_LANGS.includes(first)) return url;
  return url === "/" ? `/${lang}` : `/${lang}${url}`;
}

/** Home path for a given language */
export function langHome(lang) {
  return lang === DEFAULT_LANG ? "/" : `/${lang}`;
}

/** Detect language from a pathname */
export function langFromPath(pathname) {
  const firstSegment = (pathname || "").split("/")[1] || "";
  return SUPPORTED_LANGS.includes(firstSegment) ? firstSegment : DEFAULT_LANG;
}
