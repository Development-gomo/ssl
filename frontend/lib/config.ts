/**
 * Post types exposed by the site, keyed by their REST base.
 * Add a CPT here (and a route folder under app/) to make it public.
 * Only types listed here can be previewed or revalidated.
 */
export const POST_TYPES = {
  pages: { route: "" },
  posts: { route: "/blog" },
  projects: { route: "/projects" },
} as const;

export type RestBase = keyof typeof POST_TYPES;

export function isRestBase(value: string): value is RestBase {
  return Object.prototype.hasOwnProperty.call(POST_TYPES, value);
}

export const WORDPRESS_URL = (process.env.WORDPRESS_URL ?? "").replace(/\/$/, "");
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const REVALIDATE_SECONDS = Number(process.env.WP_REVALIDATE_SECONDS ?? 3600);
