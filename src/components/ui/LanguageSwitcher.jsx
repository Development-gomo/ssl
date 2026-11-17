// src/components/ui/LanguageSwitcher.jsx
// SV / EN links. `alternates` = { sv: "/…", en: "/en/…" } from getAlternates() (lib/api.js):
// the same page in the other language when it has a published translation,
// otherwise that language's home page.

import Link from "next/link";
import { DEFAULT_LANG, LANG_LABELS, SUPPORTED_LANGS, langHome } from "@/config";
import { postStrings } from "@/lib/postStrings";

export default function LanguageSwitcher({ lang = DEFAULT_LANG, alternates = {}, className = "", onNavigate }) {
  if (SUPPORTED_LANGS.length < 2) return null;

  return (
    <nav aria-label={postStrings(lang).language} className={`flex items-center gap-1 text-[14px] font-semibold ${className}`}>
      {SUPPORTED_LANGS.map((code, i) => {
        const label = LANG_LABELS[code]?.short || code.toUpperCase();
        const current = code === lang;
        return (
          <span key={code} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-(--color-line)">/</span>}
            {current ? (
              <span aria-current="true" className="px-1 text-(--color-accent)">
                {label}
              </span>
            ) : (
              <Link
                href={alternates?.[code] || langHome(code)}
                hrefLang={code}
                lang={code}
                title={LANG_LABELS[code]?.name}
                onClick={onNavigate}
                className="px-1 text-(--color-dark) transition-colors hover:text-(--color-accent)"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
