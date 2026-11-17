// src/app/api/wp-redirects/route.js
// Internal API route — called by src/proxy.js to fetch the redirects managed in WordPress
// with the "Redirection" plugin. Needs WP_API_USER / WP_API_PASS (Application Password).
// Without the plugin it returns [] and nothing is redirected.

import { WP_BASE } from "@/config";
import { wpAuthHeaders } from "@/lib/api";
import { maskWpString } from "@/lib/wpMask";

const PER_PAGE = 200;

export async function GET() {
  const allItems = [];

  for (let page = 0; page < 50; page++) {
    let res;
    try {
      res = await fetch(`${WP_BASE}/redirection/v1/redirect?per_page=${PER_PAGE}&page=${page}`, {
        cache: "no-store",
        headers: { Cookie: "wpSGCacheBypass=1", ...wpAuthHeaders() },
      });
    } catch {
      break;
    }
    if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) break;

    const data = await res.json().catch(() => null);
    const items = Array.isArray(data?.items) ? data.items : [];
    allItems.push(...items);
    if (items.length < PER_PAGE) break;
  }

  // Only what proxy.js needs, with CMS URLs masked so a redirect never points at the WP host
  const rules = allItems
    .filter((r) => r?.enabled !== false)
    .map((r) => ({
      url: r.url,
      action_code: r.action_code,
      match_type: r.match_type,
      action_data: { url: maskWpString(r.action_data?.url || "") },
      match_data: { source: { flag_trailing: r.match_data?.source?.flag_trailing ?? false } },
    }));
  return Response.json(rules);
}
