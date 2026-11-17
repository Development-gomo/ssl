// src/lib/postStrings.js
// UI labels that don't come from WordPress (cards, listings, post template, preview banner).
// One entry per SUPPORTED_LANGS code; falls back to the default language.
// Add a language here when adding one to src/config.

import { DEFAULT_LANG } from "@/config";

export const POST_STRINGS = {
  sv: {
    relatedHeading: "Relaterade inlägg",
    readMore: "Läs mer",
    readSuffix: "min läsning",
    newer: "← Nyare",
    older: "Äldre →",
    pageOf: (page, total) => `Sida ${page} av ${total}`,
    empty: "Inget publicerat än.",
    latestPosts: "Senaste inläggen",
    previewBanner: "Förhandsvisning – visar opublicerade ändringar",
    exitPreview: "Avsluta förhandsvisning",
    menuOpen: "Öppna meny",
    menuClose: "Stäng meny",
    language: "Språk",
    dateLocale: "sv-SE",
  },
  en: {
    relatedHeading: "Related posts",
    readMore: "Read more",
    readSuffix: "min read",
    newer: "← Newer",
    older: "Older →",
    pageOf: (page, total) => `Page ${page} of ${total}`,
    empty: "Nothing published yet.",
    latestPosts: "Latest posts",
    previewBanner: "Preview mode — showing unpublished changes",
    exitPreview: "Exit preview",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    language: "Language",
    dateLocale: "en-GB",
  },
};

export const postStrings = (lang) => POST_STRINGS[lang] || POST_STRINGS[DEFAULT_LANG] || POST_STRINGS.en;

/** "17 november 2026" / "17 November 2026" */
export function formatDate(date, lang) {
  if (!date) return "";
  return new Date(date).toLocaleDateString(postStrings(lang).dateLocale, { day: "numeric", month: "long", year: "numeric" });
}
