// src/components/major/Header.jsx
// Site header: logo + primary menu (WordPress → Appearance → Menus → "Primary").
// Menu items come from the bridge plugin (/headless/v1/settings) via Shell.
// Desktop: dropdowns on hover/focus. Mobile: full-screen panel with expandable submenus.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LANG, langHref, langHome } from "@/config";

// Normalise a menu URL: "" or "#" means "no target"
const urlOf = (v) => {
  const url = (typeof v === "string" ? v : v?.url || "").trim();
  return url === "#" ? "" : url;
};

// No URL → plain text; absolute URL → normal <a> (external sites); site path → <Link>
// with the language prefix. "#anchor" stays a same-page anchor.
function NavLink({ url, lang, className = "", onClick, target, children }) {
  const href = urlOf(url);
  if (!href) return <span className={`cursor-pointer ${className}`}>{children}</span>;
  if (/^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href)) {
    return (
      <a href={href} target={target || undefined} rel={target === "_blank" ? "noopener noreferrer" : undefined} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  // frontend URLs have no trailing slash (WordPress permalinks do)
  const path = href.length > 1 ? href.replace(/\/(?=$|[?#])/, "") : href;
  return (
    <Link href={langHref(path, lang)} target={target || undefined} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

// Flat WP menu items → top-level items with their children
function menuTree(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((item) => !item.parent)
    .map((item) => ({ ...item, children: list.filter((child) => child.parent === item.id) }));
}

export default function Header({ lang = DEFAULT_LANG, siteName = "SSL", menu = [] }) {
  const pathname = usePathname();
  const navItems = menuTree(menu);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close the mobile menu on navigation (adjusting state during render, not in an effect)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenSubmenu(null);
  }

  const isActive = (url) => {
    const href = urlOf(url).replace(/\/$/, "") || "/";
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled ? "border-(--color-line) bg-white/95 backdrop-blur" : "border-transparent bg-white"
      }`}
    >
      <div className="web-width mx-auto flex h-[76px] items-center justify-between gap-6 px-5 lg:px-8">
        <Link href={langHome(lang)} className="text-[22px] font-bold tracking-tight text-(--color-dark)">
          {siteName}
        </Link>

        {/* DESKTOP NAV */}
        {navItems.length > 0 && (
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-8">
              {navItems.map((item) => (
                <li key={item.id} className="group relative">
                  <NavLink
                    url={item.url}
                    lang={lang}
                    target={item.target}
                    className={`text-[16px] font-medium transition-colors hover:text-(--color-accent) ${isActive(item.url) ? "text-(--color-accent)" : "text-(--color-dark)"}`}
                  >
                    {item.title}
                  </NavLink>
                  {item.children.length > 0 && (
                    <ul className="invisible absolute left-1/2 top-full z-10 min-w-[220px] -translate-x-1/2 translate-y-2 rounded-xl border border-(--color-line) bg-white p-3 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <NavLink url={child.url} lang={lang} target={child.target} className="block rounded-lg px-3 py-2 text-[15px] text-(--color-dark) hover:bg-(--color-light-grey)">
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* MOBILE TOGGLE */}
        {navItems.length > 0 && (
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] lg:hidden"
          >
            <span className={`h-[2px] w-6 bg-(--color-dark) transition-transform ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`h-[2px] w-6 bg-(--color-dark) transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-[2px] w-6 bg-(--color-dark) transition-transform ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        )}
      </div>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-(--color-line) bg-white lg:hidden">
          <ul className="web-width mx-auto flex flex-col px-5 py-4">
            {navItems.map((item) => {
              const open = openSubmenu === item.id;
              return (
                <li key={item.id} className="border-b border-(--color-line) last:border-0">
                  <div className="flex items-center justify-between">
                    <NavLink url={item.url} lang={lang} target={item.target} className="block flex-1 py-4 text-[18px] font-medium text-(--color-dark)">
                      {item.title}
                    </NavLink>
                    {item.children.length > 0 && (
                      <button
                        type="button"
                        aria-label={open ? "Collapse submenu" : "Expand submenu"}
                        aria-expanded={open}
                        onClick={() => setOpenSubmenu(open ? null : item.id)}
                        className="cursor-pointer p-3 text-[20px] leading-none text-(--color-dark)"
                      >
                        {open ? "−" : "+"}
                      </button>
                    )}
                  </div>
                  {open && (
                    <ul className="pb-3 pl-4">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <NavLink url={child.url} lang={lang} target={child.target} className="block py-2 text-[16px] text-(--color-muted)">
                            {child.title}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
