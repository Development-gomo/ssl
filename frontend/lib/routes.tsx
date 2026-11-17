import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryView } from "@/components/EntryView";
import { EntryCard } from "@/components/EntryCard";
import { Pagination } from "@/components/Pagination";
import { POST_TYPES, type RestBase } from "./config";
import { entryMetadata } from "./seo";
import { entryPath, getAllEntries, getEntries, getEntryBySlug } from "./wordpress";

/**
 * Route factories so every post type (posts, projects, any new CPT)
 * gets the same archive + single behaviour from a 4-line page file.
 */

type SlugParams = { params: Promise<{ slug: string }> };
type ArchiveProps = { searchParams: Promise<{ page?: string }> };

export function singleRoute(restBase: Exclude<RestBase, "pages">) {
  return {
    async generateStaticParams() {
      try {
        const entries = await getAllEntries(restBase);
        return entries.map((e) => ({ slug: e.slug }));
      } catch {
        return []; // build still succeeds if WP is unreachable; pages render on demand
      }
    },

    async generateMetadata({ params }: SlugParams): Promise<Metadata> {
      const { slug } = await params;
      const entry = await getEntryBySlug(restBase, slug);
      return entryMetadata(entry, `${POST_TYPES[restBase].route}/${slug}`);
    },

    async Page({ params }: SlugParams) {
      const { slug } = await params;
      const entry = await getEntryBySlug(restBase, slug);
      if (!entry) notFound();
      return <EntryView entry={entry} variant="article" />;
    },
  };
}

export function archiveRoute(restBase: Exclude<RestBase, "pages">, title: string, perPage = 12) {
  return {
    metadata: { title } satisfies Metadata,

    async Page({ searchParams }: ArchiveProps) {
      const page = Math.max(1, Number((await searchParams).page) || 1);
      const { data, totalPages } = await getEntries(restBase, page, perPage);
      if (page > 1 && data.length === 0) notFound();

      return (
        <div className="container archive">
          <h1>{title}</h1>
          {data.length === 0 ? (
            <p>Nothing published yet.</p>
          ) : (
            <div className="grid">
              {data.map((entry) => (
                <EntryCard key={entry.id} entry={entry} href={entryPath(restBase, entry)} />
              ))}
            </div>
          )}
          <Pagination basePath={POST_TYPES[restBase].route} page={page} totalPages={totalPages} />
        </div>
      );
    },
  };
}
