import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { isRestBase } from "@/lib/config";
import { tags } from "@/lib/wordpress";

/**
 * POST /api/revalidate — called by the WordPress mu-plugin on publish/update/trash.
 * Header: x-revalidate-secret
 * Body:   { restBase, slug, id }  or  { tags: ["settings"] }  or  { all: true }
 */
function validSecret(given: string | null) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("x-revalidate-secret"))) {
    return Response.json({ revalidated: false, message: "Invalid secret" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    restBase?: string;
    slug?: string;
    tags?: string[];
    all?: boolean;
  };

  const toRevalidate = new Set<string>();
  if (body.all) toRevalidate.add(tags.all);
  for (const t of body.tags ?? []) toRevalidate.add(t);

  if (body.restBase && isRestBase(body.restBase)) {
    toRevalidate.add(tags.type(body.restBase));
    if (body.slug) toRevalidate.add(tags.entry(body.restBase, body.slug));
    // Menus often link to pages; the front page lives under settings.
    if (body.restBase === "pages") toRevalidate.add(tags.settings);
  }

  // { expire: 0 } = expire immediately, so editors see their change on the next request.
  for (const tag of toRevalidate) revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: true, tags: [...toRevalidate], now: Date.now() });
}
