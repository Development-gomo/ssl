/** Shapes returned by the WordPress REST API (only the fields we use). */

export interface WPRendered {
  rendered: string;
}

export interface WPImage {
  // ACF image field with return format "Image Array" (acf_format=standard)
  id?: number;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface WPLink {
  // ACF link field
  url: string;
  title: string;
  target?: string;
}

export interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: { width?: number; height?: number };
}

export interface YoastHead {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: { index?: string; follow?: string };
  og_title?: string;
  og_description?: string;
  og_image?: { url: string; width?: number; height?: number }[];
}

/** One ACF flexible content row. `acf_fc_layout` is the layout name. */
export interface FlexibleRow {
  acf_fc_layout: string;
  [key: string]: unknown;
}

export interface WPEntry {
  id: number;
  slug: string;
  status: string;
  type: string;
  date: string;
  modified: string;
  link: string;
  uri?: string; // pages only, added by the mu-plugin
  parent?: number;
  title: WPRendered;
  content: WPRendered;
  excerpt: WPRendered;
  featured_media: number;
  acf?: {
    sections?: FlexibleRow[] | false;
    [key: string]: unknown;
  } | [];
  yoast_head_json?: YoastHead;
  _embedded?: {
    "wp:featuredmedia"?: WPMedia[];
    author?: { name: string }[];
  };
}

export interface MenuItem {
  id: number;
  parent: number;
  title: string;
  url: string;
  target: string;
}

export interface SiteSettings {
  name: string;
  description: string;
  frontPage: string | null;
  menus: Record<string, MenuItem[]>;
}
