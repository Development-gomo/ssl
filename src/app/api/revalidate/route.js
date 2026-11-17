// src/app/api/revalidate/route.js
// Called by the WordPress bridge plugin (wordpress/headless-bridge) on every save, trash,
// ACF save, menu change and site-settings change.
//
// Header: x-revalidate-secret (or x-revalidate-token) = REVALIDATE_SECRET
// Body:   { restBase: "posts", slug: "hello-world", id }   → that entry + its archive + home
//         { restBase: "pages", slug: "about", id }         → whole site (menus/child paths can change)
//         { tags: ["settings"] }                          → whole site (menus, site title, front page)
//         { all: true }                                   → whole site

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { SUPPORTED_LANGS, ROUTE_TYPES, typeFromRest } from "@/config";

function validSecret(given) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req) {
  const token = req.headers.get("x-revalidate-secret") || req.headers.get("x-revalidate-token");
  if (!validSecret(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const restBase = body.restBase || body.postType;
  const type = restBase ? typeFromRest(restBase) || typeFromRest(`${restBase}s`) : null;
  const revalidated = [];

  if (type && body.slug) {
    // A post / CPT entry: its own page, its archive and the home page (it may list latest posts).
    // Paths are the internal /{lang}/… routes (next.config.mjs rewrites the default language).
    for (const lang of SUPPORTED_LANGS) {
      const base = ROUTE_TYPES[type].base[lang];
      for (const path of [`/${lang}/${base}/${body.slug}`, `/${lang}/${base}`, `/${lang}`]) {
        revalidatePath(path);
        revalidated.push(path);
      }
    }
    revalidatePath("/sitemap.xml");
  } else if (body.all || restBase === "pages" || restBase === "page" || (Array.isArray(body.tags) && body.tags.length)) {
    // Pages, menus and site settings can affect every page (header/footer, child paths)
    revalidatePath("/", "layout");
    revalidated.push("/ (layout — everything)");
  } else {
    return NextResponse.json({ error: "Nothing to revalidate" }, { status: 400 });
  }

  return NextResponse.json({ revalidated, timestamp: new Date().toISOString() });
}
