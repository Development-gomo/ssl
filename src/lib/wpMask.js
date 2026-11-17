// src/lib/wpMask.js
// Hides the WordPress backend from the browser (server-side only).
// Every string in WP responses is rewritten before it reaches a page or client:
//   https://gomostaging.com/ssl/wp-content/…  → unchanged (media stays on the CMS host)
//   https://gomostaging.com/ssl/wp-json/…     → /api/content/…  (src/app/api/content)
//   https://gomostaging.com/ssl/about/        → /about/          (permalinks become site paths)
//   https://<this site>/about/                → /about/          (the bridge plugin already points links here)
// Works on plain and JSON-escaped ("https:\/\/…") URLs, e.g. inside Yoast's yoast_head_json.
// REST-only metadata (_links, guid) is dropped.

import { WP_BASE } from "@/config";

// Browser responses are already masked by /api/content, so nothing to do client-side
const WP_REST = typeof window === "undefined" ? WP_BASE || "" : "";

/** WP site URL without /wp-json, e.g. "https://gomostaging.com/ssl" */
export const WP_SITE = WP_REST.replace(/\/wp-json\/?$/, "").replace(/\/$/, "");

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SLASH = String.raw`(?:\/|\\\/)`; // "/" or JSON-escaped "\/"

const site = WP_SITE ? new URL(WP_SITE) : null;
const HOST = site ? site.host.replace(/^www\./, "") : "";
const PATH = site ? site.pathname.split("/").filter(Boolean).map((p) => SLASH + escape(p)).join("") : "";

// groups: 1 = separator, 2 = WP core folder (only when one follows the site URL)
const SITE_RE = site
  ? new RegExp(String.raw`https?:${SLASH}${SLASH}(?:www\.)?${escape(HOST)}${PATH}(?:(${SLASH})(wp-content|wp-json|wp-includes|wp-admin)(?=${SLASH}))?(?![\w.-])`, "gi")
  : null;

// This site's own origin(s): SITE_URL and the Vercel production domain
const FRONTEND_HOSTS = [process.env.SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((u) => u.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""));
const FRONTEND_RE = FRONTEND_HOSTS.length
  ? new RegExp(String.raw`https?:${SLASH}${SLASH}(?:www\.)?(?:${FRONTEND_HOSTS.map(escape).join("|")})(?![\w.-])`, "gi")
  : null;

function bareToRoot(match, offset, whole) {
  // keep the path that follows ("/about/"); bare site URL → "/"
  const next = whole[offset + match.length];
  return next === "/" || next === "\\" ? "" : "/";
}

export function maskWpString(value) {
  if (typeof value !== "string") return value;
  let out = value;
  if (SITE_RE && out.includes(HOST)) {
    out = out.replace(SITE_RE, (match, sep, kind, offset, whole) => {
      if (kind === "wp-content") return match; // media stays on the CMS host
      if (kind === "wp-json") return `${sep}api${sep}content`;
      if (kind === "wp-includes") return `${sep}static`; // core media icons, proxied in next.config.mjs
      if (kind === "wp-admin") return `${sep}admin`; // never linked publicly; just don't name it
      return bareToRoot(match, offset, whole);
    });
  }
  if (FRONTEND_RE && FRONTEND_HOSTS.some((h) => out.includes(h))) {
    out = out.replace(FRONTEND_RE, (match, offset, whole) => bareToRoot(match, offset, whole));
  }
  return out;
}

// REST metadata nobody renders; yoast_head is Yoast's raw <head> HTML (we use the JSON)
const DROP_KEYS = new Set(["_links", "guid", "yoast_head", "_acf_changed"]);
// Plugin-specific keys renamed so they don't show up in page payloads. Code reads the new names:
const RENAME_KEYS = {
  acf_fc_layout: "_layout", // flexible content row → block._layout
  yoast_head_json: "seo", // entry.seo (lib/seo.js)
  "_yoast_wpseo_meta-robots-noindex": "noindex", // entry.meta.noindex (sitemap)
  class_list: "classes", // entry.classes, without WP's "hentry"
};

/** Deep-copy WP JSON with every CMS URL masked and plugin keys neutralised. */
export function maskWp(data) {
  if (typeof data === "string") return maskWpString(data);
  if (Array.isArray(data)) return data.map(maskWp);
  if (data && typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (DROP_KEYS.has(k)) continue;
      out[RENAME_KEYS[k] || k] = k === "class_list" && Array.isArray(v) ? v.filter((c) => c !== "hentry") : maskWp(v);
    }
    return out;
  }
  return data;
}
