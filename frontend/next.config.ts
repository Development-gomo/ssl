import type { NextConfig } from "next";

const wpUrl = new URL(process.env.WORDPRESS_URL ?? "https://cms.example.com");

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to optimise media served from WordPress.
    remotePatterns: [
      {
        protocol: wpUrl.protocol.replace(":", "") as "http" | "https",
        hostname: wpUrl.hostname,
        port: wpUrl.port,
        // Keeps any subfolder install path, e.g. https://gomostaging.com/ssl → /ssl/wp-content/uploads/**
        pathname: `${wpUrl.pathname.replace(/\/$/, "")}/wp-content/uploads/**`,
      },
    ],
  },
  // WordPress permalinks usually end with a slash; keep URLs identical to avoid SEO churn.
  trailingSlash: false,
};

export default nextConfig;
