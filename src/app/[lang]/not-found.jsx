// src/app/[lang]/not-found.jsx

import Shell from "@/components/templates/Shell";
import { DEFAULT_LANG, langFromPath, langHome } from "@/config";
import { headers } from "next/headers";
import CtaButton from "@/components/ui/CtaButton";
import { NOT_FOUND_MESSAGES } from "@/lib/notFoundMessages";

export default async function LangScopedNotFound() {
  // params are not passed to not-found components; read the pathname set by src/proxy.js
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const lang = langFromPath(pathname);
  const messages = NOT_FOUND_MESSAGES[lang] || NOT_FOUND_MESSAGES[DEFAULT_LANG] || NOT_FOUND_MESSAGES.en;

  return (
    <Shell lang={lang} mainClassName="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-(--color-muted)">404</p>
      <h1 className="text-4xl font-semibold">{messages.title}</h1>
      <p className="max-w-xl text-(--color-muted)">{messages.description}</p>
      <CtaButton href={langHome(lang)}>{messages.buttonText}</CtaButton>
    </Shell>
  );
}
