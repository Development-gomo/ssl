// src/components/major/PageBuilder.jsx
// Renders the ACF "Page builder" flexible content field (acf.page_builder).
// Each row's layout name (acf_fc_layout, renamed to _layout in lib/wpMask.js) maps to a section.
//
// Add a layout:
//   1. add it to the "Page builder" field group in ACF (e.g. testimonials_section)
//   2. create the section in src/components/sections/… (props: { data, lang })
//   3. import it below and add a `case`

import { Fragment } from "react";
import dynamic from "next/dynamic";
import { DEFAULT_LANG } from "@/config";

const HomeHero = dynamic(() => import("../sections/home/HomeHero"));
const TextMedia = dynamic(() => import("../sections/inner-pages/TextMedia"));
const CtaSection = dynamic(() => import("../sections/inner-pages/CtaSection"));

export default function PageBuilder({ sections, lang = DEFAULT_LANG }) {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  return (
    <>
      {sections.map((block, index) => {
        if (!block) return null;
        const key = `${block._layout}-${index}`;

        switch (block._layout) {
          case "hero_section":
            return <HomeHero key={key} data={block} lang={lang} first={index === 0} />;
          case "text_media_section":
            return <TextMedia key={key} data={block} lang={lang} />;
          case "cta_section":
            return <CtaSection key={key} data={block} lang={lang} />;
          default:
            // Unknown layout: visible in development, skipped in production
            return process.env.NODE_ENV !== "production" ? (
              <Fragment key={key}>
                <div className="web-width mx-auto my-6 rounded-lg border-2 border-dashed border-red-500 px-5 py-4 text-red-600">
                  Missing component for ACF layout <code>{block._layout}</code> (src/components/major/PageBuilder.jsx)
                </div>
              </Fragment>
            ) : null;
        }
      })}
    </>
  );
}
