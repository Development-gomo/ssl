// src/app/preview/[type]/[id]/page.jsx
// Draft preview. WordPress "Preview" → /api/preview (enables draft mode) → here.
// Reads the draft (or newest autosave) with the Application Password. Never cached or indexed.

import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { getPreviewEntry } from "@/lib/api";
import { resolveParams } from "@/lib/params";
import { DEFAULT_LANG, ROUTE_TYPES, SUPPORTED_LANGS, typeFromRest } from "@/config";
import { postStrings } from "@/lib/postStrings";
import PostTemplate from "@/components/templates/PostTemplate";
import EntryTemplate from "@/components/templates/EntryTemplate";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const PREVIEW_TYPES = new Set(["pages", ...Object.values(ROUTE_TYPES).map((t) => t.rest)]);

export default async function PreviewPage({ params }) {
  const { isEnabled } = await draftMode();
  const { type, id } = resolveParams(await params);
  if (!isEnabled || !PREVIEW_TYPES.has(type) || !/^\d+$/.test(id || "")) notFound();

  const entry = await getPreviewEntry(type, Number(id));
  if (!entry) notFound();

  const lang = SUPPORTED_LANGS.includes(entry.lang) ? entry.lang : DEFAULT_LANG;
  const t = postStrings(lang);
  const banner = (
    <div className="bg-amber-100 px-5 py-2.5 text-center text-[15px] text-amber-900">
      {t.previewBanner} ({entry.status}).{" "}
      {/* API route (clears the draft-mode cookie), so a full request rather than <Link> */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/exit-preview" className="font-semibold underline">
        {t.exitPreview}
      </a>
    </div>
  );

  return typeFromRest(type) === "post" ? (
    <PostTemplate post={entry} lang={lang} banner={banner} />
  ) : (
    <EntryTemplate entry={entry} lang={lang} banner={banner} showFeaturedImage={type !== "pages"} />
  );
}
