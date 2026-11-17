import type { WPLink } from "@/lib/types";
import { SmartLink } from "../SmartLink";

/** ACF layout "cta": heading (text), text (textarea), button (link) */
export function Cta({ heading, text, button }: { heading?: string; text?: string; button?: WPLink | false }) {
  return (
    <section className="block cta">
      <div className="container">
        {heading && <h2>{heading}</h2>}
        {text && <p>{text}</p>}
        {button && <SmartLink link={button} className="button button-light" />}
      </div>
    </section>
  );
}
