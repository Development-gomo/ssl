// src/app/[lang]/page.jsx
// Home page = the page set under WordPress → Settings → Reading → "A static page".
// Without a static front page, the latest posts are listed instead.

import EntryTemplate from "@/components/templates/EntryTemplate";
import ArchiveTemplate from "@/components/templates/ArchiveTemplate";
import { getFrontPage, getEntriesPage, getSiteSettings } from "@/lib/api";
import { buildMetadataFromYoast } from "@/lib/seo";
import { resolveParams } from "@/lib/params";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "@/config";

export const revalidate = 300;

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default async function LangHomePage({ params }) {
  const resolvedParams = resolveParams(await params);
  const lang = resolvedParams.lang || DEFAULT_LANG;

  const page = await getFrontPage(lang);
  if (page) return <EntryTemplate entry={page} lang={lang} />;

  const { items, totalPages } = await getEntriesPage("post", 1, 12, lang);
  return <ArchiveTemplate type="post" items={items} page={1} totalPages={totalPages} lang={lang} />;
}

export async function generateMetadata({ params }) {
  const resolvedParams = resolveParams(await params);
  const lang = resolvedParams.lang || DEFAULT_LANG;
  const [page, settings] = await Promise.all([getFrontPage(lang), getSiteSettings()]);
  return buildMetadataFromYoast(page, {
    fallbackTitle: settings.description ? `${settings.name} – ${settings.description}` : settings.name,
    lang,
    path: "/",
  });
}
