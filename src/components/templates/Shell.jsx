// src/components/templates/Shell.jsx
// Header + <main> + Footer wrapper shared by every page and template.

import Header from "@/components/major/Header";
import Footer from "@/components/major/Footer";
import { getSiteSettings } from "@/lib/api";
import { DEFAULT_LANG } from "@/config";

// alternates: { sv: "/…", en: "/en/…" } — this page in each language (language switcher)
export default async function Shell({ lang = DEFAULT_LANG, children, mainClassName = "", banner = null, alternates = {} }) {
  const settings = await getSiteSettings(lang);

  return (
    <>
      {banner}
      <Header lang={lang} siteName={settings.name} menu={settings.menus.primary || []} alternates={alternates} />
      <main className={mainClassName}>{children}</main>
      <Footer lang={lang} />
    </>
  );
}
