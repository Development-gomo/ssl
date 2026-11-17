// src/app/not-found.jsx
// Fallback 404 for URLs outside [lang] (most 404s are handled by src/app/[lang]/not-found.jsx).

import { DEFAULT_LANG, langFromPath, langHome } from "@/config";
import { headers } from "next/headers";
import CtaButton from "@/components/ui/CtaButton";
import { NOT_FOUND_MESSAGES } from "@/lib/notFoundMessages";

export default async function GlobalNotFound() {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const lang = langFromPath(pathname);
  const messages = NOT_FOUND_MESSAGES[lang] || NOT_FOUND_MESSAGES[DEFAULT_LANG] || NOT_FOUND_MESSAGES.en;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-(--color-muted)">404</p>
        <h1 className="text-4xl font-semibold">{messages.title}</h1>
        <p className="max-w-lg text-(--color-muted)">{messages.description}</p>
      </div>
      <CtaButton href={langHome(lang)}>{messages.buttonText}</CtaButton>
    </main>
  );
}
