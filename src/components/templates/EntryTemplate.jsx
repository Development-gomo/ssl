// src/components/templates/EntryTemplate.jsx
// Generic single entry (pages, child pages, projects): renders the ACF page_builder
// when the entry has one, then the WordPress editor content. Without builder sections
// the title is shown as a simple page header.

import Image from "next/image";
import PageBuilder from "@/components/major/PageBuilder";
import Shell from "./Shell";
import { builderSections } from "@/lib/content";

export default function EntryTemplate({ entry, lang, showFeaturedImage = false, banner = null, alternates = {} }) {
  const sections = builderSections(entry);
  const hasBuilder = sections.length > 0;
  const hasHero = sections[0]?._layout === "hero_section";
  const image = entry?._embedded?.["wp:featuredmedia"]?.[0];
  const content = entry?.content?.rendered?.trim();

  return (
    <Shell lang={lang} banner={banner} alternates={alternates}>
      {!hasHero && entry?.title?.rendered && (
        <header className="bg-(--color-light-grey)">
          <div className="web-width mx-auto px-5 py-14 lg:px-8 lg:py-20">
            <h1 className="ssl-h1 max-w-4xl" dangerouslySetInnerHTML={{ __html: entry.title.rendered }} />
          </div>
        </header>
      )}

      {hasBuilder && <PageBuilder sections={sections} lang={lang} />}

      {(content || (showFeaturedImage && image?.source_url)) && (
        <article className="web-width mx-auto px-5 py-14 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-[760px] space-y-8">
            {showFeaturedImage && image?.source_url && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl">
                <Image src={image.source_url} alt={image.alt_text || ""} fill className="object-cover" sizes="(min-width: 800px) 760px, 100vw" priority />
              </div>
            )}
            {content && <div className="ssl-content" dangerouslySetInnerHTML={{ __html: content }} />}
          </div>
        </article>
      )}
    </Shell>
  );
}
