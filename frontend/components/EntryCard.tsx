import Image from "next/image";
import Link from "next/link";
import type { WPEntry } from "@/lib/types";
import { featuredImage, stripHtml } from "@/lib/wordpress";

export function EntryCard({ entry, href }: { entry: WPEntry; href: string }) {
  const image = featuredImage(entry);
  return (
    <Link href={href} className="card">
      {image && <Image src={image.url} alt={image.alt} width={600} height={340} sizes="(max-width: 768px) 100vw, 33vw" />}
      <div className="card-body">
        <h3>{stripHtml(entry.title.rendered)}</h3>
        <p>{stripHtml(entry.excerpt?.rendered ?? "").slice(0, 140)}</p>
      </div>
    </Link>
  );
}
