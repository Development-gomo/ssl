import Link from "next/link";
import type { MenuItem } from "@/lib/types";
import { SmartLink } from "./SmartLink";

export function Header({ siteName, menu }: { siteName: string; menu: MenuItem[] }) {
  const topLevel = menu.filter((item) => item.parent === 0);
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">{siteName}</Link>
        {topLevel.length > 0 && (
          <nav aria-label="Primary">
            <ul>
              {topLevel.map((item) => {
                const children = menu.filter((child) => child.parent === item.id);
                return (
                  <li key={item.id} className={children.length ? "has-children" : undefined}>
                    <SmartLink link={item} />
                    {children.length > 0 && (
                      <ul className="submenu">
                        {children.map((child) => (
                          <li key={child.id}><SmartLink link={child} /></li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
