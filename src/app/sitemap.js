// src/app/sitemap.js
// Dynamically generated sitemap from WordPress content.

import { getAllEntriesByType, getSiteSettings } from "@/lib/api";
import { SUPPORTED_LANGS, DEFAULT_LANG, ROUTE_TYPES } from "@/config";

export const revalidate = 300;

const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

function url(lang, path) {
  const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
  return `${SITE_URL}${prefix}${path}`;
}

export default async function sitemap() {
  const entries = [];
  const { frontPage } = await getSiteSettings();

  for (const lang of SUPPORTED_LANGS) {
    // Homepage
    entries.push({ url: lang === DEFAULT_LANG ? `${SITE_URL}/` : `${SITE_URL}/${lang}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 });

    // Pages (full path incl. parents via the bridge plugin's `uri`)
    const pages = await getAllEntriesByType("pages", lang);
    for (const page of pages) {
      const path = (page.uri || page.slug || "").replace(/^\/|\/$/g, "");
      if (!path || path === frontPage) continue;
      if (page.meta?.noindex === "1") continue; // Yoast noindex, renamed in lib/wpMask.js
      entries.push({ url: url(lang, `/${path}`), lastModified: new Date(page.modified || page.date || Date.now()), changeFrequency: "monthly", priority: 0.8 });
    }

    // Archives + single entries per content type
    for (const [type, { rest, base }] of Object.entries(ROUTE_TYPES)) {
      const items = await getAllEntriesByType(rest, lang);
      if (items.length > 0) entries.push({ url: url(lang, `/${base[lang]}`), changeFrequency: "weekly", priority: 0.6 });
      for (const item of items) {
        if (item.meta?.noindex === "1") continue;
        entries.push({
          url: url(lang, `/${base[lang]}/${item.slug}`),
          lastModified: new Date(item.modified || item.date || Date.now()),
          changeFrequency: type === "post" ? "weekly" : "monthly",
          priority: 0.6,
        });
      }
    }
  }

  return entries;
}
