// src/app/robots.js
// This file keeps the build happy (Next.js requires a default export).
// The actual /robots.txt response is served by src/proxy.js, which also blocks
// indexing on Vercel preview deployments.

const SITE_URL = process.env.SITE_URL;

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/preview/"],
    },
    ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  };
}
