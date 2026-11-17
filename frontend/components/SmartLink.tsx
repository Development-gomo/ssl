import Link from "next/link";
import { SITE_URL, WORDPRESS_URL } from "@/lib/config";

/** Internal links use <Link> (client navigation), external ones a plain <a>. */
export function SmartLink({ link, className, children }: {
  link: { url: string; title?: string; target?: string };
  className?: string;
  children?: React.ReactNode;
}) {
  let href = link.url;
  // Absolute links to WordPress or to this site itself become relative paths.
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  for (const origin of [WORDPRESS_URL, SITE_URL, vercelUrl]) {
    if (origin && href.startsWith(origin) && !href.includes("/wp-content/")) {
      href = href.slice(origin.length) || "/";
      break;
    }
  }
  // Match the frontend's URL style (no trailing slash, except the root).
  if (href.length > 1 && href.startsWith("/")) href = href.replace(/\/(?=$|[?#])/, "");
  const label = children ?? link.title;
  const isInternal = href.startsWith("/") && !href.startsWith("//");

  if (isInternal && link.target !== "_blank") {
    return <Link href={href} className={className}>{label}</Link>;
  }
  return (
    <a href={href} className={className} target={link.target || undefined} rel={link.target === "_blank" ? "noopener noreferrer" : undefined}>
      {label}
    </a>
  );
}
