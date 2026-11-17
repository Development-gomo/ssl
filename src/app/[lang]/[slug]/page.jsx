// src/app/[lang]/[slug]/page.jsx
// One segment after the language:
//   /om-oss, /en/about  → top-level WordPress page
//   /blogg, /en/blog    → archive of a content type (ROUTE_TYPES base in src/config),
//                         unless a WordPress page with that slug exists
//   /home               → 308 to the language's home when it is the static front page

import { notFound, permanentRedirect } from "next/navigation";
import { getPageBySlug, getEntriesPage, getAllEntriesByType, getSiteSettings, getAlternates } from "@/lib/api";
import { resolveParams } from "@/lib/params";
import EntryTemplate from "@/components/templates/EntryTemplate";
import ArchiveTemplate from "@/components/templates/ArchiveTemplate";
import { buildMetadataFromYoast } from "@/lib/seo";
import { DEFAULT_LANG, SUPPORTED_LANGS, ROUTE_TYPES, langHome, langHref, typeFromBase } from "@/config";

export const revalidate = 300;

const PER_PAGE = 12;

export async function generateStaticParams() {
  const results = await Promise.all(SUPPORTED_LANGS.map((lang) => getAllEntriesByType("pages", lang)));
  return SUPPORTED_LANGS.flatMap((lang, i) => [
    // top-level pages only — child pages live under their parent's path ([lang]/[slug]/[...rest])
    ...results[i].filter((p) => !p.parent).map((p) => ({ lang, slug: p.slug })),
    // archive bases (/blogg, /en/blog …)
    ...Object.values(ROUTE_TYPES).map(({ base }) => ({ lang, slug: base[lang] })),
  ]);
}

async function resolve(params) {
  const parsed = resolveParams(await params);
  const lang = parsed?.lang || DEFAULT_LANG;
  const slug = parsed?.slug ? decodeURIComponent(parsed.slug) : "";
  const [page, settings] = slug ? await Promise.all([getPageBySlug(slug, lang), getSiteSettings(lang)]) : [null, null];
  // a page must be top-level and in this language (WPML falls back to other languages otherwise)
  const ownPage = page && !page.parent && (!page.lang || page.lang === lang) ? page : null;
  return { lang, slug, page: ownPage, settings };
}

export default async function SinglePage({ params, searchParams }) {
  const { lang, slug, page, settings } = await resolve(params);
  if (!slug) notFound();

  if (page) {
    if (settings.frontPage && slug === settings.frontPage) permanentRedirect(langHome(lang));
    const alternates = await getAlternates({ kind: "page", entry: page });
    return <EntryTemplate entry={page} lang={lang} alternates={alternates} />;
  }

  const type = typeFromBase(slug, lang);
  if (type) {
    // searchParams is only read here, so regular pages stay static
    const pageNumber = Math.max(1, Number((await searchParams)?.page) || 1);
    const [{ items, totalPages }, alternates] = await Promise.all([
      getEntriesPage(type, pageNumber, PER_PAGE, lang),
      getAlternates({ kind: "archive", type }),
    ]);
    if (pageNumber > 1 && items.length === 0) notFound();
    return <ArchiveTemplate type={type} items={items} page={pageNumber} totalPages={totalPages} lang={lang} alternates={alternates} />;
  }

  notFound();
}

export async function generateMetadata({ params }) {
  const { lang, slug, page, settings } = await resolve(params);

  if (page) {
    const alternates = await getAlternates({ kind: "page", entry: page });
    return buildMetadataFromYoast(page, { fallbackTitle: settings.name, lang, path: langHref(`/${slug}`, lang), alternates });
  }
  const type = typeFromBase(slug, lang);
  if (type) {
    const label = ROUTE_TYPES[type].label?.[lang] || slug;
    const alternates = await getAlternates({ kind: "archive", type });
    return buildMetadataFromYoast(null, { fallbackTitle: `${label} | ${settings?.name || "SSL"}`, lang, path: langHref(`/${slug}`, lang), alternates });
  }
  return { title: settings?.name || "SSL" };
}
