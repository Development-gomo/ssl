import type { ComponentType } from "react";
import type { FlexibleRow } from "@/lib/types";
import { Hero } from "./Hero";
import { TextMedia } from "./TextMedia";
import { Cta } from "./Cta";

/**
 * Maps ACF flexible content layout names → React components.
 * To add a layout: create the layout in ACF, add a component in this folder,
 * and register it here with the same name as the ACF layout.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAYOUTS: Record<string, ComponentType<any>> = {
  hero: Hero,
  text_media: TextMedia,
  cta: Cta,
};

export function FlexibleContent({ sections }: { sections: FlexibleRow[] }) {
  if (!sections.length) return null;
  return (
    <>
      {sections.map((row, i) => {
        const Component = LAYOUTS[row.acf_fc_layout];
        if (!Component) {
          if (process.env.NODE_ENV !== "production") {
            return (
              <div key={i} className="missing-layout">
                Missing component for ACF layout <code>{row.acf_fc_layout}</code>
              </div>
            );
          }
          return null;
        }
        return <Component key={i} {...row} />;
      })}
    </>
  );
}
