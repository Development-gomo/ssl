import type { MenuItem } from "@/lib/types";
import { SmartLink } from "./SmartLink";

export function Footer({ siteName, menu }: { siteName: string; menu: MenuItem[] }) {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <p>© {new Date().getFullYear()} {siteName}</p>
        {menu.length > 0 && (
          <nav aria-label="Footer">
            <ul>
              {menu.filter((i) => i.parent === 0).map((item) => (
                <li key={item.id}><SmartLink link={item} /></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
