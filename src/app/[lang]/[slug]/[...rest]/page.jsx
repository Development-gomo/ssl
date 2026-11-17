// src/app/[lang]/[slug]/[...rest]/page.jsx
// Every URL with 2+ segments after the language:
//   /{base}/{slug}  → single entry; the base comes from ROUTE_TYPES in src/config
//                     (/blogg/hej → post, /en/blog/hello → post, /projekt/x → project)
//   anything else   → child page by its full path, e.g. /om-oss/team
// An unknown entry under a base falls back to a child page with that path.

import { cache } from "react";
import { notFound } from "next/navigation";
import { getPostBySlug, getEntryBySlug, getPageByPath, getAllEntriesByType, getSiteSettings, getAlternates } from "@/lib/api";
import { resolveParams } from "@/lib/params";
import { buildMetadataFromYoast } from "@/lib/seo";
import { DEFAULT_LANG, SUPPORTED_LANGS, ROUTE_TYPES, langHref, typeFromBase } from "@/config";
import PostTemplate from "@/components/templates/PostTemplate";
import EntryTemplate from "@/components/templates/EntryTemplate";

export const revalidate = 300;

// Pre-render every entry of every ROUTE_TYPE and every child page; anything newer renders on first request
export async function generateStaticParams() {
  const params = [];
  for (const lang of SUPPORTED_LANGS) {
    for (const { rest, base } of Object.values(ROUTE_TYPES)) {
      const entries = await getAllEntriesByType(rest, lang);
      params.push(...entries.map((e) => ({ lang, slug: base[lang], rest: [e.slug] })));
    }
    const pages = await getAllEntriesByType("pages", lang);
    for (const page of pages) {
      const segments = (page.uri || "").replace(/^\/|\/$/g, "").split("/").filter(Boolean);
      if (segments.length >= 2) params.push({ lang, slug: segments[0], rest: segments.slice(1) });
    }
  }
  return params;
}

// Shared by the page and generateMetadata (fetches are deduped by fetchWP as well)
const resolveRoute = cache(async (lang, segments) => {
  const [base, slug] = segments;
  const type = segments.length === 2 ? typeFromBase(base, lang) : null;

  // WPML falls back to other languages for unknown slugs — only accept this language's entry
  const inLang = (entry) => entry && (!entry.lang || entry.lang === lang);

  if (type === "post") {
    const post = await getPostBySlug(slug, lang);
    if (inLang(post)) return { type, entry: post, alternates: await getAlternates({ kind: type, entry: post }) };
  } else if (type) {
    const entry = await getEntryBySlug(type, slug, lang);
    if (inLang(entry)) return { type, entry, alternates: await getAlternates({ kind: type, entry }) };
  }

  const page = await getPageByPath(segments, lang);
  if (inLang(page)) return { type: "page", entry: page, alternates: await getAlternates({ kind: "page", entry: page }) };

  return null;
});

async function routeFromParams(params) {
  const parsed = resolveParams(await params);
  const lang = parsed?.lang || DEFAULT_LANG;
  const rest = Array.isArray(parsed?.rest) ? parsed.rest : [parsed?.rest].filter(Boolean);
  const segments = [parsed?.slug, ...rest].filter(Boolean).map((s) => decodeURIComponent(s));
  if (segments.length < 2) return { lang, segments, route: null };
  return { lang, segments, route: await resolveRoute(lang, segments) };
}

export default async function LocalizedEntryPage({ params }) {
  const { lang, route } = await routeFromParams(params);
  if (!route) notFound();

  switch (route.type) {
    case "post":
      return <PostTemplate post={route.entry} lang={lang} alternates={route.alternates} />;
    case "page":
      return <EntryTemplate entry={route.entry} lang={lang} alternates={route.alternates} />;
    default:
      // custom post types (projects …) — swap in a dedicated template once a design exists
      return <EntryTemplate entry={route.entry} lang={lang} alternates={route.alternates} showFeaturedImage />;
  }
}

export async function generateMetadata({ params }) {
  const { lang, segments, route } = await routeFromParams(params);
  const settings = await getSiteSettings(lang);
  return buildMetadataFromYoast(route?.entry, {
    fallbackTitle: settings.name,
    lang,
    path: langHref(`/${segments.join("/")}`, lang),
    alternates: route?.alternates,
  });
}
