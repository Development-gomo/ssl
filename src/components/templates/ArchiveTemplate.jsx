// src/components/templates/ArchiveTemplate.jsx
// Listing page for a content type — /blog, /projects (bases from ROUTE_TYPES in src/config).
// Used when no WordPress page exists with that slug; a WP page with the same slug wins
// (put a page builder on it to design the archive's intro).

import NewsListing from "@/components/sections/inner-pages/NewsListing";
import Shell from "./Shell";
import { ROUTE_TYPES } from "@/config";

export default function ArchiveTemplate({ type, items, page, totalPages, lang }) {
  const title = ROUTE_TYPES[type]?.label?.[lang] || ROUTE_TYPES[type]?.base?.[lang] || "";

  return (
    <Shell lang={lang}>
      <header className="bg-(--color-light-grey)">
        <div className="web-width mx-auto px-5 py-14 lg:px-8 lg:py-20">
          <h1 className="ssl-h1">{title}</h1>
        </div>
      </header>
      <NewsListing type={type} items={items} page={page} totalPages={totalPages} lang={lang} />
    </Shell>
  );
}
