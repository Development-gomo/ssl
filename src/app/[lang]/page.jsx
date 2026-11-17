// src/app/[lang]/page.jsx
// Home page = the page set under WordPress → Settings → Reading → "A static page"
// (WPML returns the translated front page per language).
// Without a static front page, the latest posts are listed instead.

import EntryTemplate from "@/components/templates/EntryTemplate";
import ArchiveTemplate from "@/components/templates/ArchiveTemplate";
import { getFrontPage, getEntriesPage, getSiteSettings, getAlternates } from "@/lib/api";
import { buildMetadataFromYoast } from "@/lib/seo";
import { resolveParams } from "@/lib/params";
import { postStrings } from "@/lib/postStrings";
import { DEFAULT_LANG, SUPPORTED_LANGS, langHome } from "@/config";

export const revalidate = 300;

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default async function LangHomePage({ params }) {
  const resolvedParams = resolveParams(await params);
  const lang = resolvedParams.lang || DEFAULT_LANG;
  const alternates = await getAlternates({ kind: "home" });

  const page = await getFrontPage(lang);
  if (page) return <EntryTemplate entry={page} lang={lang} alternates={alternates} />;

  const { items, totalPages } = await getEntriesPage("post", 1, 12, lang);
  return (
    <ArchiveTemplate type="post" items={items} page={1} totalPages={totalPages} lang={lang} title={postStrings(lang).latestPosts} alternates={alternates} />
  );
}

export async function generateMetadata({ params }) {
  const resolvedParams = resolveParams(await params);
  const lang = resolvedParams.lang || DEFAULT_LANG;
  const [page, settings, alternates] = await Promise.all([getFrontPage(lang), getSiteSettings(lang), getAlternates({ kind: "home" })]);
  return buildMetadataFromYoast(page, {
    fallbackTitle: settings.description ? `${settings.name} – ${settings.description}` : settings.name,
    lang,
    path: langHome(lang),
    alternates,
  });
}
