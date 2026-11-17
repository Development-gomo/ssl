import Image from "next/image";
import type { WPImage, WPLink } from "@/lib/types";
import { SmartLink } from "../SmartLink";

/** ACF layout "hero": heading (text), text (textarea), image (image array), button (link) */
export function Hero({ heading, text, image, button }: {
  heading?: string;
  text?: string;
  image?: WPImage | false;
  button?: WPLink | false;
}) {
  return (
    <section className="block hero">
      {image && (
        <Image
          src={image.url}
          alt={image.alt ?? ""}
          fill
          priority
          sizes="100vw"
          className="hero-bg"
        />
      )}
      <div className="container hero-inner">
        {heading && <h1>{heading}</h1>}
        {text && <p className="lead">{text}</p>}
        {button && <SmartLink link={button} className="button" />}
      </div>
    </section>
  );
}
