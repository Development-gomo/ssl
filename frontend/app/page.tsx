import type { Metadata } from "next";
import { EntryView } from "@/components/EntryView";
import { EntryCard } from "@/components/EntryCard";
import { entryMetadata } from "@/lib/seo";
import { entryPath, getEntries, getPageByPath, getSettings } from "@/lib/wordpress";

/**
 * Home page = the page set under Settings → Reading → "A static page".
 * Falls back to the latest posts when no front page is configured.
 */
async function getFrontPage() {
  const { frontPage } = await getSettings();
  return frontPage ? getPageByPath(frontPage) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  return entryMetadata(await getFrontPage(), "/");
}

export default async function Home() {
  const page = await getFrontPage();
  if (page) return <EntryView entry={page} variant="page" />;

  const { data } = await getEntries("posts", 1, 9).catch(() => ({ data: [] }));
  return (
    <div className="container archive">
      <h1>Latest posts</h1>
      <div className="grid">
        {data.map((post) => (
          <EntryCard key={post.id} entry={post} href={entryPath("posts", post)} />
        ))}
      </div>
    </div>
  );
}
