import { rewriteLinks } from "@/lib/wordpress";

/**
 * Renders Gutenberg/classic editor HTML from WordPress.
 * Content comes from your own CMS (trusted editors), so it's rendered as-is.
 */
export function WpContent({ html, className = "prose" }: { html: string; className?: string }) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: rewriteLinks(html) }} />;
}
