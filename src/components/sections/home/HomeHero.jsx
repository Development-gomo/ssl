// src/components/sections/home/HomeHero.jsx
// ACF layout: hero_section (Page builder).
// Fields: heading (text), text (textarea), image (image, array), button (link).
// Background image with a dark overlay; without an image the section is dark.

import Image from "next/image";
import CtaButton from "@/components/ui/CtaButton";
import { DEFAULT_LANG, langHref } from "@/config";
import { linkOf, mediaUrl, toHtml } from "@/lib/content";

export default function HomeHero({ data, lang = DEFAULT_LANG, first = false }) {
  const heading = data?.heading || "";
  const text = data?.text || "";
  const image = mediaUrl(data?.image);
  const button = linkOf(data?.button);

  return (
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden bg-(--color-dark) text-white">
      {image && (
        <>
          <Image src={image} alt={data?.image?.alt || ""} fill priority={first} sizes="100vw" className="-z-10 object-cover" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-black/55" />
        </>
      )}
      <div className="web-width mx-auto w-full px-5 py-24 lg:px-8">
        <div className="max-w-3xl space-y-6">
          {heading && (first ? <h1 className="ssl-h1">{heading}</h1> : <h2 className="ssl-h1">{heading}</h2>)}
          {text && <p className="text-[19px] leading-[30px] text-white/85 lg:text-[21px]" dangerouslySetInnerHTML={{ __html: toHtml(text) }} />}
          {button && (
            <CtaButton href={langHref(button.url, lang)} target={button.target} className="mt-2">
              {button.title || "Read more"}
            </CtaButton>
          )}
        </div>
      </div>
    </section>
  );
}
