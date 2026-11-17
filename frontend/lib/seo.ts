import type { Metadata } from "next";
import { SITE_URL } from "./config";
import { featuredImage, stripHtml } from "./wordpress";
import type { WPEntry } from "./types";

/**
 * Builds Next.js metadata from an entry. Uses Yoast's `yoast_head_json`
 * when Yoast SEO is installed, otherwise falls back to title/excerpt.
 */
export function entryMetadata(entry: WPEntry | null, path: string): Metadata {
  if (!entry) return {};
  const yoast = entry.yoast_head_json;
  const title = yoast?.title ?? stripHtml(entry.title.rendered);
  const description = yoast?.description ?? stripHtml(entry.excerpt?.rendered ?? "").slice(0, 160);
  const image = yoast?.og_image?.[0]?.url ?? featuredImage(entry)?.url;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    robots: yoast?.robots ? { index: yoast.robots.index !== "noindex", follow: yoast.robots.follow !== "nofollow" } : undefined,
    openGraph: {
      title: yoast?.og_title ?? title,
      description: yoast?.og_description ?? description,
      url: `${SITE_URL}${path}`,
      images: image ? [{ url: image }] : undefined,
    },
  };
}
