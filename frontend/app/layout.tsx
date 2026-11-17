import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SITE_URL } from "@/lib/config";
import { getSettings } from "@/lib/wordpress";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: settings.name, template: `%s | ${settings.name}` },
    description: settings.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en">
      <body>
        <Header siteName={settings.name} menu={settings.menus.primary ?? []} />
        <main>{children}</main>
        <Footer siteName={settings.name} menu={settings.menus.footer ?? []} />
      </body>
    </html>
  );
}
