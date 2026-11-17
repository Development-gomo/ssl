"use client";

// src/app/error.jsx
// Global error boundary — catches runtime errors in the app shell.
// Must be a Client Component (Next.js requirement).

import { useEffect } from "react";
import CtaButton from "@/components/ui/CtaButton";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log to your error reporting service here when ready (e.g. Sentry)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-(--color-muted)">Error</p>
        <h1 className="text-4xl font-semibold">Something went wrong</h1>
        <p className="max-w-lg text-(--color-muted)">An unexpected error occurred. Please try again or return to the homepage.</p>
      </div>
      <div className="flex gap-4">
        <CtaButton onClick={reset} variant="outline-dark">
          Try again
        </CtaButton>
        <CtaButton href="/">Go to Homepage</CtaButton>
      </div>
    </div>
  );
}
