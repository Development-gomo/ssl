// src/app/layout.js
// Root layout: owns <html> and <body>. Language and page type come from headers set by
// src/proxy.js, so <html lang> and the <body> class are right on the first render
// (LangSyncer keeps them in sync on client navigation).

import "./globals.css";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { DEFAULT_LANG } from "@/config";
import LangSyncer from "@/components/LangSyncer";
//import Script from "next/script"; // uncomment when adding tracking scripts

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  // Yoast URLs arrive site-relative (WP host masked), so resolve them against our domain
  ...(process.env.SITE_URL ? { metadataBase: new URL(process.env.SITE_URL) } : {}),
  title: { default: "SSL", template: "%s" },
};

export default async function RootLayout({ children }) {
  const h = await headers();
  const lang = h.get("x-lang") || DEFAULT_LANG;
  // Page type from the URL (src/config pageTypeFromPath): home, page, archive, article, project
  const pageType = h.get("x-page-type") || "page";

  return (
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      <head>
        {/* ── Cookie banner / Google Tag Manager / other tracking scripts go here ── */}
      </head>
      <body className={`${pageType} flex min-h-screen flex-col`} suppressHydrationWarning>
        <LangSyncer />
        {children}
      </body>
    </html>
  );
}
