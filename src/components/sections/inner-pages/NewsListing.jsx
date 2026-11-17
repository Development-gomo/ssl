// src/components/sections/inner-pages/NewsListing.jsx
// Card grid with pagination for a content type's archive (/blog, /projects …).
// Pages are server-rendered links (?page=2), so every page is crawlable.

import Link from "next/link";
import PostCard from "@/components/ui/PostCard";
import { DEFAULT_LANG, ROUTE_TYPES, langHref } from "@/config";
import { postStrings } from "@/lib/postStrings";

export default function NewsListing({ type = "post", items = [], page = 1, totalPages = 1, lang = DEFAULT_LANG }) {
  const t = postStrings(lang);
  const basePath = langHref(`/${ROUTE_TYPES[type]?.base[lang] || ""}`, lang);
  const pageHref = (p) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  return (
    <section className="py-14 lg:py-20">
      <div className="web-width mx-auto px-5 lg:px-8">
        {items.length === 0 ? (
          <p className="text-(--color-muted)">{t.empty}</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PostCard key={item.id} post={item} type={type} lang={lang} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-between text-[15px]">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="font-semibold text-(--color-accent)">{t.newer}</Link>
            ) : (
              <span />
            )}
            <span className="text-(--color-muted)">
              {t.pageOf(page, totalPages)}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1)} className="font-semibold text-(--color-accent)">{t.older}</Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
