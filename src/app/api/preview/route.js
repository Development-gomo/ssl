// src/app/api/preview/route.js
// GET /api/preview?secret=…&id=123&type=posts
// Called by the WordPress "Preview" button (bridge plugin's preview_post_link filter):
// turns on draft mode and opens /preview/{type}/{id}.

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTE_TYPES } from "@/config";

const PREVIEW_TYPES = new Set(["pages", ...Object.values(ROUTE_TYPES).map((t) => t.rest)]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const id = searchParams.get("id") || "";
  const type = searchParams.get("type") || "";

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  if (!PREVIEW_TYPES.has(type) || !/^\d+$/.test(id)) {
    return new Response("Invalid preview request", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(`/preview/${type}/${id}`);
}
