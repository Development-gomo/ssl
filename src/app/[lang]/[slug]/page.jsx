// src/app/[lang]/[slug]/page.jsx
// One segment after the language:
//   /about        → top-level WordPress page
//   /blog         → archive of a content type (ROUTE_TYPES base in src/config),
//                   unless a WordPress page with that slug exists
//   /home         → 308 to "/" when "home" is the static front page

import { notFound, permanentRedirect } from "next/navigation";
import { getPageBySlug, getEntriesPage, getAllEntriesByType, getSiteSettings } from "@/lib/api";
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
    // archive bases (/blog, /projects)
    ...Object.values(ROUTE_TYPES).map(({ base }) => ({ lang, slug: base[lang] })),
  ]);
}

export default async function SinglePage({ params, searchParams }) {
  const parsed = resolveParams(await params);
  const lang = parsed?.lang || DEFAULT_LANG;
  const slug = parsed?.slug ? decodeURIComponent(parsed.slug) : "";
  if (!slug) notFound();

  const [page, settings] = await Promise.all([getPageBySlug(slug, lang), getSiteSettings()]);

  if (page && !page.parent) {
    if (settings.frontPage && slug === settings.frontPage) permanentRedirect(langHome(lang));
    return <EntryTemplate entry={page} lang={lang} />;
  }

  const type = typeFromBase(slug, lang);
  if (type) {
    // searchParams is only read here, so regular pages stay static
    const pageNumber = Math.max(1, Number((await searchParams)?.page) || 1);
    const { items, totalPages } = await getEntriesPage(type, pageNumber, PER_PAGE, lang);
    if (pageNumber > 1 && items.length === 0) notFound();
    return <ArchiveTemplate type={type} items={items} page={pageNumber} totalPages={totalPages} lang={lang} />;
  }

  notFound();
}

export async function generateMetadata({ params }) {
  const parsed = resolveParams(await params);
  const lang = parsed?.lang || DEFAULT_LANG;
  const slug = parsed?.slug ? decodeURIComponent(parsed.slug) : "";
  const [page, settings] = await Promise.all([getPageBySlug(slug, lang), getSiteSettings()]);

  if (page && !page.parent) {
    return buildMetadataFromYoast(page, { fallbackTitle: settings.name, lang, path: langHref(`/${slug}`, lang) });
  }
  const type = typeFromBase(slug, lang);
  if (type) {
    const label = ROUTE_TYPES[type].label?.[lang] || slug;
    return { title: `${label} | ${settings.name}`, alternates: { canonical: langHref(`/${slug}`, lang) } };
  }
  return { title: settings.name };
}
