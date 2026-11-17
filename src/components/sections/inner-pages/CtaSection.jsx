// src/components/sections/inner-pages/CtaSection.jsx
// ACF layout: cta_section (Page builder).
// Fields: heading (text), text (textarea), button (link).

import CtaButton from "@/components/ui/CtaButton";
import { DEFAULT_LANG, langHref } from "@/config";
import { linkOf, toHtml } from "@/lib/content";

export default function CtaSection({ data, lang = DEFAULT_LANG }) {
  const heading = data?.heading || "";
  const text = data?.text || "";
  const button = linkOf(data?.button);

  return (
    <section className="bg-(--color-accent) py-18 text-center text-white lg:py-24">
      <div className="web-width mx-auto flex flex-col items-center gap-5 px-5 lg:px-8">
        {heading && <h2 className="ssl-h2 max-w-3xl text-white">{heading}</h2>}
        {text && <p className="max-w-2xl text-[18px] leading-[28px] text-white/90" dangerouslySetInnerHTML={{ __html: toHtml(text) }} />}
        {button && (
          <CtaButton href={langHref(button.url, lang)} target={button.target} variant="outline-light" className="mt-3">
            {button.title || "Get in touch"}
          </CtaButton>
        )}
      </div>
    </section>
  );
}
