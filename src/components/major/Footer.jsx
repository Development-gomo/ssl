// src/components/major/Footer.jsx
// Site footer: name + tagline, footer menu (WordPress → Appearance → Menus → "Footer").

import Link from "next/link";
import { getSiteSettings } from "@/lib/api";
import { DEFAULT_LANG, langHref, langHome } from "@/config";

const isExternal = (href) => /^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href);

export default async function Footer({ lang = DEFAULT_LANG }) {
  const settings = await getSiteSettings(lang);
  const items = (Array.isArray(settings.menus.footer) ? settings.menus.footer : []).filter((item) => !item.parent);

  return (
    <footer className="mt-auto bg-(--color-dark) text-white">
      <div className="web-width mx-auto flex flex-col gap-10 px-5 py-14 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-sm space-y-3">
          <Link href={langHome(lang)} className="text-[22px] font-bold">
            {settings.name}
          </Link>
          {settings.description && <p className="text-[15px] text-white/70">{settings.description}</p>}
        </div>

        {items.length > 0 && (
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-3">
              {items.map((item) => {
                const href = (item.url || "").trim();
                const label = <span className="text-[15px] text-white/80 transition-colors hover:text-white">{item.title}</span>;
                if (!href || href === "#") return <li key={item.id}>{label}</li>;
                return (
                  <li key={item.id}>
                    {isExternal(href) ? (
                      <a href={href} target={item.target || undefined} rel={item.target === "_blank" ? "noopener noreferrer" : undefined}>
                        {label}
                      </a>
                    ) : (
                      <Link href={langHref(href.length > 1 ? href.replace(/\/(?=$|[?#])/, "") : href, lang)}>{label}</Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-white/10">
        <p className="web-width mx-auto px-5 py-6 text-[14px] text-white/60 lg:px-8">
          © {new Date().getFullYear()} {settings.name}
        </p>
      </div>
    </footer>
  );
}
