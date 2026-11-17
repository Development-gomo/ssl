// src/app/[lang]/layout.js
// Root layout (src/app/layout.js) owns <html> and <body>.
// This nested layout is a pass-through; lang is handled via src/proxy.js + root layout.

export default function LangLayout({ children }) {
  return <>{children}</>;
}
