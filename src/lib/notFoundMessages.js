// src/lib/notFoundMessages.js
// Shared 404 copy for every supported language — used by both the
// lang-scoped not-found page and the root fallback not-found page.

export const NOT_FOUND_MESSAGES = {
  sv: {
    title: "Sidan du letar efter finns inte.",
    description:
      "Den kan ha tagits bort, bytt namn eller vara tillfälligt otillgänglig. Kontrollera adressen eller gå tillbaka till startsidan.",
    buttonText: "Till startsidan",
  },
  en: {
    title: "The page you're looking for doesn't exist.",
    description:
      "It might have been removed, renamed, or is temporarily unavailable. Please double-check the URL or head back to the homepage.",
    buttonText: "Go to Homepage",
  },
};
