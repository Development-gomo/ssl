import type { MetadataRoute } from "next";
import { POST_TYPES, SITE_URL, type RestBase } from "@/lib/config";
import { entryPath, getAllEntries, getSettings } from "@/lib/wordpress";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { frontPage } = await getSettings();
  const urls: MetadataRoute.Sitemap = [{ url: SITE_URL, changeFrequency: "weekly", priority: 1 }];

  for (const restBase of Object.keys(POST_TYPES) as RestBase[]) {
    const entries = await getAllEntries(restBase).catch(() => []);
    for (const entry of entries) {
      const path = entryPath(restBase, entry, frontPage);
      if (path === "/") continue;
      urls.push({ url: `${SITE_URL}${path}`, lastModified: entry.modified });
    }
    if (POST_TYPES[restBase].route) urls.push({ url: `${SITE_URL}${POST_TYPES[restBase].route}` });
  }
  return urls;
}
