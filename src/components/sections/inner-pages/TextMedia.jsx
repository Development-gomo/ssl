// src/components/sections/inner-pages/TextMedia.jsx
// ACF layout: text_media_section (Page builder).
// Fields: heading (text), content (wysiwyg), image (image, array), image_position (select: left|right).

import Image from "next/image";
import { toHtml } from "@/lib/content";

export default function TextMedia({ data }) {
  const heading = data?.heading || "";
  const content = data?.content || "";
  const image = data?.image && data.image.url ? data.image : null;
  const imageLeft = (data?.image_position?.value ?? data?.image_position) === "left";

  return (
    <section className="py-18 lg:py-28">
      <div className={`web-width mx-auto grid items-center gap-10 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8 ${image ? "" : "lg:grid-cols-1"}`}>
        <div className={`space-y-5 ${imageLeft ? "lg:order-2" : ""}`}>
          {heading && <h2 className="ssl-h2">{heading}</h2>}
          {content && <div className="ssl-content" dangerouslySetInnerHTML={{ __html: toHtml(content) }} />}
        </div>
        {image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-(--color-light-grey)">
            <Image src={image.url} alt={image.alt || ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
