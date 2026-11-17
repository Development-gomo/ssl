import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EntryView } from "@/components/EntryView";
import { entryMetadata } from "@/lib/seo";
import { getAllEntries, getPageByPath, getSettings } from "@/lib/wordpress";

/** WordPress pages, including nested ones like /about/team. */
type Props = { params: Promise<{ slug: string[] }> };

export async function generateStaticParams() {
  try {
    const [pages, { frontPage }] = await Promise.all([getAllEntries("pages"), getSettings()]);
    return pages
      .map((p) => (p.uri ?? p.slug).replace(/^\/|\/$/g, ""))
      .filter((uri) => uri && uri !== frontPage)
      .map((uri) => ({ slug: uri.split("/") }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = (await params).slug.join("/");
  return entryMetadata(await getPageByPath(path), `/${path}`);
}

export default async function WpPage({ params }: Props) {
  const path = (await params).slug.map(decodeURIComponent).join("/");

  const { frontPage } = await getSettings();
  if (frontPage && path === frontPage) permanentRedirect("/");

  const page = await getPageByPath(path);
  if (!page) notFound();

  return <EntryView entry={page} variant="page" />;
}
