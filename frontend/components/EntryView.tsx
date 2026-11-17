import Image from "next/image";
import type { WPEntry } from "@/lib/types";
import { featuredImage, flexibleSections, stripHtml } from "@/lib/wordpress";
import { FlexibleContent } from "./blocks/FlexibleContent";
import { WpContent } from "./WpContent";

/**
 * Shared renderer for pages, posts and CPTs (also used by the preview route).
 * If the entry has ACF flexible sections they drive the layout; the editor
 * content is still rendered below them, so either authoring style works.
 */
export function EntryView({ entry, variant }: { entry: WPEntry; variant: "page" | "article" }) {
  const sections = flexibleSections(entry);
  const hasHero = sections[0]?.acf_fc_layout === "hero";
  const image = featuredImage(entry);
  const author = entry._embedded?.author?.[0]?.name;

  return (
    <article>
      {!hasHero && (
        <header className="container entry-header">
          <h1>{stripHtml(entry.title.rendered)}</h1>
          {variant === "article" && (
            <p className="meta">
              <time dateTime={entry.date}>
                {new Date(entry.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </time>
              {author && <> · {author}</>}
            </p>
          )}
        </header>
      )}

      {variant === "article" && image && (
        <div className="container">
          <Image src={image.url} alt={image.alt} width={image.width} height={image.height} priority sizes="(max-width: 1100px) 100vw, 1100px" className="entry-image" />
        </div>
      )}

      <FlexibleContent sections={sections} />

      {entry.content?.rendered && (
        <div className="container entry-content">
          <WpContent html={entry.content.rendered} />
        </div>
      )}
    </article>
  );
}
