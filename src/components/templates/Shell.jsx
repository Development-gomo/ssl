// src/components/templates/Shell.jsx
// Header + <main> + Footer wrapper shared by every page and template.

import Header from "@/components/major/Header";
import Footer from "@/components/major/Footer";
import { getSiteSettings } from "@/lib/api";
import { DEFAULT_LANG } from "@/config";

export default async function Shell({ lang = DEFAULT_LANG, children, mainClassName = "", banner = null }) {
  const settings = await getSiteSettings();

  return (
    <>
      {banner}
      <Header lang={lang} siteName={settings.name} menu={settings.menus.primary || []} />
      <main className={mainClassName}>{children}</main>
      <Footer lang={lang} />
    </>
  );
}
