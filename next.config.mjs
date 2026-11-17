/** @type {import('next').NextConfig} */
import { SUPPORTED_LANGS, DEFAULT_LANG } from "./src/config/index.js";

// WP REST root, e.g. https://gomostaging.com/ssl/wp-json (WORDPRESS_URL is the older name, without /wp-json)
const wpBase = process.env.NEXT_PUBLIC_WP_BASE || `${(process.env.WORDPRESS_URL || "https://gomostaging.com/ssl").replace(/\/$/, "")}/wp-json`;
const wpHostname = new URL(wpBase).hostname;
// WP site URL without /wp-json — media stays on it (see src/lib/wpMask.js)
const wpSite = wpBase.replace(/\/wp-json\/?$/, "").replace(/\/$/, "");
const nonDefaultLangs = SUPPORTED_LANGS.filter((l) => l !== DEFAULT_LANG);

const nextConfig = {
  reactStrictMode: true,

  images: {
    // Serve CMS images as-is instead of through Vercel Image Optimization (no quota surprises);
    // WP already generates resized sizes. Set to false to use Vercel's optimizer.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: wpHostname, pathname: "/**" },
      { protocol: "https", hostname: `www.${wpHostname}`, pathname: "/**" },
    ],
  },

  async headers() {
    const siteUrl = process.env.SITE_URL;
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      ...(siteUrl
        ? [
            {
              source: "/",
              headers: [{ key: "Link", value: `<${siteUrl}/sitemap.xml>; rel="sitemap", <${siteUrl}/robots.txt>; rel="robots"` }],
            },
          ]
        : []),
    ];
  },

  async rewrites() {
    return [
      // core media icons under our own domain
      { source: "/static/:path*", destination: `${wpSite}/wp-includes/:path*` },
      // API routes and draft previews must not fall into the default-language rewrite
      { source: "/api/:path*", destination: "/api/:path*" },
      { source: "/preview/:path*", destination: "/preview/:path*" },
      // Pass-throughs for each non-default language (prevents catch-all rewrite below from grabbing them)
      ...nonDefaultLangs.flatMap((lang) => [
        { source: `/${lang}`, destination: `/${lang}` },
        { source: `/${lang}/:path*`, destination: `/${lang}/:path*` },
      ]),
      // Default language: rewrite everything else to /en/...
      { source: "/", destination: `/${DEFAULT_LANG}` },
      { source: "/:path*", destination: `/${DEFAULT_LANG}/:path*` },
    ];
  },
};

export default nextConfig;
