import Image from "next/image";
import type { WPImage } from "@/lib/types";
import { WpContent } from "../WpContent";

/** ACF layout "text_media": heading (text), content (wysiwyg), image (image array), image_position (select: left|right) */
export function TextMedia({ heading, content, image, image_position = "right" }: {
  heading?: string;
  content?: string;
  image?: WPImage | false;
  image_position?: "left" | "right";
}) {
  return (
    <section className={`block text-media container ${image_position === "left" ? "reverse" : ""}`}>
      <div>
        {heading && <h2>{heading}</h2>}
        {content && <WpContent html={content} />}
      </div>
      {image && (
        <Image
          src={image.url}
          alt={image.alt ?? ""}
          width={image.width ?? 1200}
          height={image.height ?? 800}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
    </section>
  );
}
