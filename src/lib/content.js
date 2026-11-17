// src/lib/content.js
// Helpers for rendering ACF fields consistently across section components.

/**
 * Turn a CMS text value into HTML for dangerouslySetInnerHTML.
 * WYSIWYG fields already contain markup; textarea fields are plain text where
 * line breaks are meaningful, so they become <br>.
 */
export function toHtml(value) {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/<(p|h[1-6]|ul|ol|div)[\s>]/i.test(trimmed)) return trimmed;
  return trimmed.replace(/\r?\n/g, "<br />");
}

/** Return a non-empty array or [] — ACF returns false/"" for empty repeaters. */
export function rows(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

/** URL of an ACF image/file field (array return format) or a plain string. */
export function mediaUrl(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.url || "";
}

/** ACF link field ({ url, title, target }) → normalised link, or null when empty / "#". */
export function linkOf(field) {
  if (!field) return null;
  const url = (typeof field === "string" ? field : field.url || "").trim();
  if (!url || url === "#") return null;
  return { url, title: field.title || "", target: field.target || "" };
}

/** Plain text from rendered HTML (titles in <title>, excerpts on cards). */
export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&#8230;|\[&hellip;\]|&hellip;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ACF returns `[]` when an entry has no fields — normalise to the page_builder rows. */
export function builderSections(entry) {
  const acf = entry?.acf;
  if (!acf || Array.isArray(acf)) return [];
  return rows(acf.page_builder);
}

/** Estimated reading time in minutes from rendered post HTML (200 wpm). */
export function readingMinutes(html) {
  const words = (html || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
