import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { isRestBase } from "@/lib/config";

/**
 * GET /api/preview?secret=…&id=123&type=posts
 * Called by WordPress' "Preview" button (see the mu-plugin's preview_post_link filter).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const id = searchParams.get("id") ?? "";
  const type = searchParams.get("type") ?? "";

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview secret", { status: 401 });
  }
  if (!isRestBase(type) || !/^\d+$/.test(id)) {
    return new Response("Invalid preview request", { status: 400 });
  }

  (await draftMode()).enable();
  redirect(`/preview/${type}/${id}`);
}
