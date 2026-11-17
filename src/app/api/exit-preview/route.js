// src/app/api/exit-preview/route.js
// Turns draft mode off and returns to the homepage.

import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  (await draftMode()).disable();
  redirect("/");
}
