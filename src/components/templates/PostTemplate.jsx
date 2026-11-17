// src/components/templates/PostTemplate.jsx
// Single blog post — /blog/{slug}.
// Layout: hero (featured image + overlay, date, read time, H1), the body in a 760px
// reading column (.ssl-content in globals.css), optional ACF page_builder sections,
// and up to 3 related posts (PostCard).

import Image from "next/image";
import PageBuilder from "@/components/major/PageBuilder";
import PostCard from "@/components/ui/PostCard";
import Shell from "./Shell";
import { builderSections, readingMinutes } from "@/lib/content";

export default function PostTemplate({ post, lang, banner = null }) {
  const image = post?._embedded?.["wp:featuredmedia"]?.[0];
  const author = post?._embedded?.author?.[0]?.name;
  const related = Array.isArray(post?.relatedPosts) ? post.relatedPosts : [];
  const sections = builderSections(post);
  const contentHtml = post?.content?.rendered;

  return (
    <Shell lang={lang} banner={banner}>
      {/* HERO */}
      <section className="relative isolate flex min-h-[max(55vh,380px)] items-end overflow-hidden bg-(--color-dark) text-white">
        {image?.source_url && (
          <>
            <Image src={image.source_url} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
            <span aria-hidden className="absolute inset-0 -z-10 bg-black/60" />
          </>
        )}
        <div className="web-width mx-auto w-full space-y-4 px-5 pb-12 pt-24 lg:px-8 lg:pb-16">
          <p className="text-[15px] text-white/80">
            {post?.date && (
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </time>
            )}
            {author && <> · {author}</>}
            {contentHtml && <> · {readingMinutes(contentHtml)} min read</>}
          </p>
          {post?.title?.rendered && <h1 className="ssl-h1 max-w-4xl" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />}
        </div>
      </section>

      {/* ARTICLE */}
      {contentHtml && (
        <article className="web-width mx-auto px-5 py-14 lg:px-8 lg:py-20">
          <div className="ssl-content mx-auto max-w-[760px]" dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </article>
      )}

      {/* ACF flexible content (if a post uses it) renders full width below the body */}
      {sections.length > 0 && <PageBuilder sections={sections} lang={lang} />}

      {/* RELATED POSTS */}
      {related.length > 0 && (
        <section className="bg-(--color-light-grey) py-16 lg:py-24">
          <div className="web-width mx-auto flex flex-col gap-10 px-5 lg:px-8">
            <h2 className="ssl-h2">Related posts</h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {related.map((relatedPost) => (
                <PostCard key={relatedPost.id} post={relatedPost} lang={lang} />
              ))}
            </div>
          </div>
        </section>
      )}
    </Shell>
  );
}
