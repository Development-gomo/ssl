import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { EntryView } from "@/components/EntryView";
import { isRestBase } from "@/lib/config";
import { getPreviewEntry } from "@/lib/wordpress";

/**
 * Draft preview. Reached via WordPress' "Preview" button →
 * /api/preview (enables draft mode) → here. Never indexed, never cached.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ type: string; id: string }> };

export default async function PreviewPage({ params }: Props) {
  const { isEnabled } = await draftMode();
  const { type, id } = await params;
  if (!isEnabled || !isRestBase(type) || !/^\d+$/.test(id)) notFound();

  const entry = await getPreviewEntry(type, Number(id));
  if (!entry) notFound();

  return (
    <>
      <div className="preview-banner">
        Preview mode — showing unpublished changes ({entry.status}).{" "}
        <a href="/api/exit-preview">Exit preview</a>
      </div>
      <EntryView entry={entry} variant={type === "pages" ? "page" : "article"} />
    </>
  );
}
