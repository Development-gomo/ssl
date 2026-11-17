// src/components/ui/PostCard.jsx
// Card for listings and "related" rows: featured image, date, title, excerpt.

import Image from "next/image";
import Link from "next/link";
import { stripHtml } from "@/lib/content";
import { DEFAULT_LANG, entryHref } from "@/config";
import { formatDate, postStrings } from "@/lib/postStrings";

export default function PostCard({ post, type = "post", lang = DEFAULT_LANG, readMore }) {
  const readMoreLabel = readMore || postStrings(lang).readMore;
  const image = post?._embedded?.["wp:featuredmedia"]?.[0];
  const title = stripHtml(post?.title?.rendered);
  const excerpt = stripHtml(post?.excerpt?.rendered).slice(0, 150);
  const href = entryHref(type, post?.slug, lang);

  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-xl border border-(--color-line) bg-white transition-shadow duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-(--color-light-grey)">
        {image?.source_url && (
          <Image src={image.source_url} alt={image.alt_text || ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        {post?.date && type === "post" && (
          <time dateTime={post.date} className="text-[14px] text-(--color-muted)">
            {formatDate(post.date, lang)}
          </time>
        )}
        <h3 className="text-[20px] leading-[26px] font-semibold text-(--color-dark)">{title}</h3>
        {excerpt && <p className="text-[15px] leading-[22px] text-(--color-muted)">{excerpt}</p>}
        <span className="mt-auto pt-2 text-[15px] font-semibold text-(--color-accent)">{readMoreLabel} →</span>
      </div>
    </Link>
  );
}
