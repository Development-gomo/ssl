import Link from "next/link";
import { WORDPRESS_URL } from "@/lib/config";

/** Internal links use <Link> (client navigation), external ones a plain <a>. */
export function SmartLink({ link, className, children }: {
  link: { url: string; title?: string; target?: string };
  className?: string;
  children?: React.ReactNode;
}) {
  let href = link.url;
  if (WORDPRESS_URL && href.startsWith(WORDPRESS_URL) && !href.includes("/wp-content/")) {
    href = href.slice(WORDPRESS_URL.length) || "/";
  }
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
