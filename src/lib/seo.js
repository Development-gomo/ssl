// src/lib/seo.js

import { DEFAULT_LANG, LOCALE_MAP } from "@/config";
import { stripHtml } from "@/lib/content";

function mapOgImages(images = []) {
  if (!Array.isArray(images)) return undefined;
  const mapped = images
    .map((img) => (img?.url ? { url: img.url, width: img.width, height: img.height, type: img.type, alt: img.alt } : null))
    .filter(Boolean);
  return mapped.length > 0 ? mapped : undefined;
}

/** { sv: "/x", en: "/en/x" } → { "sv-SE": "/x", "en-US": "/en/x", "x-default": "/x" } (only with 2+ languages) */
export function hreflangLanguages(alternates) {
  if (!alternates || Object.keys(alternates).length < 2) return null;
  const languages = {};
  for (const [lang, href] of Object.entries(alternates)) {
    languages[(LOCALE_MAP[lang] || lang).replace("_", "-")] = href;
  }
  if (alternates[DEFAULT_LANG]) languages["x-default"] = alternates[DEFAULT_LANG];
  return languages;
}

/** Next.js metadata from an entry — Yoast's yoast_head_json (renamed to `seo` in lib/wpMask.js) when present. */
export function buildMetadataFromYoast(entry, options = {}) {
  const {
    fallbackTitle = "SSL",
    fallbackDescription = undefined, // no description tag rather than a placeholder
    lang = DEFAULT_LANG,
    path = undefined, // site path for the canonical URL when Yoast has none
    alternates = null, // { sv: "/…", en: "/en/…" } from getAlternates() → hreflang links
  } = options;

  const languages = hreflangLanguages(alternates);

  if (!entry) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      ...(path || languages ? { alternates: { ...(path ? { canonical: path } : {}), ...(languages ? { languages } : {}) } } : {}),
    };
  }

  const yoast = entry.seo;
  const renderedTitle = stripHtml(entry?.title?.rendered);
  const renderedExcerpt = stripHtml(entry?.excerpt?.rendered);

  const title = yoast?.title || renderedTitle || fallbackTitle;
  const description = yoast?.description || yoast?.og_description || renderedExcerpt || fallbackDescription;
  const canonical = yoast?.canonical || path;

  const metadata = {
    title,
    description,
    alternates: canonical || languages ? { ...(canonical ? { canonical } : {}), ...(languages ? { languages } : {}) } : undefined,
    openGraph: {
      title: yoast?.og_title || title,
      description: yoast?.og_description || description,
      url: yoast?.og_url || path,
      siteName: yoast?.og_site_name,
      type: yoast?.og_type || (entry?.type === "post" ? "article" : "website"),
      locale: yoast?.og_locale || LOCALE_MAP[lang] || LOCALE_MAP[DEFAULT_LANG],
      images: mapOgImages(yoast?.og_image),
    },
    twitter: {
      card: yoast?.twitter_card || "summary_large_image",
      title: yoast?.twitter_title || yoast?.og_title || title,
      description: yoast?.twitter_description || yoast?.og_description || description,
      images: yoast?.twitter_image ? [yoast.twitter_image] : undefined,
    },
  };

  if (yoast?.robots) {
    metadata.robots = { index: yoast.robots.index !== "noindex", follow: yoast.robots.follow !== "nofollow" };
  }

  if (!metadata.openGraph.images) {
    const featuredMedia = entry?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    if (featuredMedia) metadata.openGraph.images = [{ url: featuredMedia }];
  }

  return metadata;
}
