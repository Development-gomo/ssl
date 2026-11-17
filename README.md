# SSL — Headless WordPress + Next.js

**Backend (WordPress):** https://gomostaging.com/ssl · **Frontend:** Next.js on Vercel (root directory `frontend`)


WordPress is the CMS (editors keep the admin they know). Next.js 16 (App Router) renders the public site on Vercel and reads content over the **WP REST API**. Pages are statically generated and refreshed **instantly on publish** via a webhook; editors' **Preview** button shows drafts on the real frontend.

```
headless-wp-next/
├── wordpress/
│   ├── headless-bridge.zip              ← the bridge plugin (Plugins → Add New → Upload)
│   ├── headless-bridge/headless-bridge.php  (source of the zip)
│   └── acf-page-builder-import.json     ← example ACF flexible-content field group
└── frontend/                            ← Next.js app (deploy to Vercel)
    ├── app/
    │   ├── page.tsx                     front page (Settings → Reading)
    │   ├── [...slug]/page.tsx           WP pages, incl. nested (/about/team)
    │   ├── blog/ , projects/            archives + singles (posts, "project" CPT)
    │   ├── preview/[type]/[id]/         draft preview (draft mode only)
    │   ├── api/revalidate               webhook WordPress calls on save
    │   ├── api/preview, api/exit-preview
    │   └── sitemap.ts, robots.ts
    ├── components/blocks/               one React component per ACF layout
    └── lib/
        ├── config.ts                    post types ↔ routes
        ├── wordpress.ts                 REST client, cache tags, helpers
        ├── routes.tsx                   archive/single route factories
        └── seo.ts                       metadata (uses Yoast if installed)
```

## How it fits together

| Flow | What happens |
|---|---|
| **Visitor** | Next.js serves static HTML. Data is fetched from `/wp-json/...` at build or on first request and cached with tags. |
| **Editor publishes / updates / trashes** | mu-plugin → `POST /api/revalidate` with `{restBase, slug}` → Next.js expires `type:<restBase>` and `<restBase>:<slug>` → next request gets fresh content. Menu and site-title changes expire the `settings` tag. A 1-hour time-based refresh is the safety net. |
| **Editor clicks Preview** | WP links to `/api/preview?secret&id&type` → draft mode cookie → `/preview/<type>/<id>` fetches the draft (and newest autosave) with an Application Password. Never cached or indexed. |
| **Someone opens the old WP theme URL** | Optional 301 to the same path on the frontend (`HEADLESS_REDIRECT_FRONTEND`). |

---

## 1. WordPress (backend)

WordPress runs at `https://gomostaging.com/ssl` (subfolder installs are supported).

1. **Permalinks:** Settings → Permalinks → *Post name*. (Required for `/wp-json/`.)
2. **Plugins:**
   - **ACF Pro** (or ACF free if you don't need flexible content)
   - **Yoast SEO** (optional — its `yoast_head_json` is used for titles/descriptions/OG automatically)
3. **Bridge plugin:** Plugins → Add New → Upload Plugin → `wordpress/headless-bridge.zip` → Activate.
   (Alternatively copy `headless-bridge.php` into `wp-content/mu-plugins/` so it can't be deactivated.)
   It adds:
   - `GET /wp-json/headless/v1/settings` — site name, front page and menus (core's menu endpoint needs auth)
   - `uri` field on pages (full path for nested pages)
   - revalidation webhook on publish/update/trash, ACF save and menu/settings changes
   - Preview button → Next.js draft mode
   - "View post" links pointing to the frontend
   - example `project` CPT (`rest_base: projects`) and `primary` / `footer` menu locations
4. **wp-config.php** — add above `/* That's all, stop editing! */`:

   ```php
   define( 'HEADLESS_FRONTEND_URL', 'https://your-project.vercel.app' ); // your Vercel URL / domain
   define( 'HEADLESS_REVALIDATE_SECRET', 'paste-a-long-random-string' );
   define( 'HEADLESS_PREVIEW_SECRET', 'paste-another-long-random-string' );
   define( 'HEADLESS_REDIRECT_FRONTEND', true ); // optional, enable once the frontend is live
   ```
   Generate secrets with `openssl rand -hex 32`.
5. **ACF field group:** ACF → Tools → Import → `acf-page-builder-import.json`. It creates a *Page builder* flexible content field (`sections`) with **Hero**, **Text + media** and **CTA** layouts on Pages and Projects, with **Show in REST API** enabled.
   For your own field groups: enable **Show in REST API** in the group settings, and use the *Array* return format for images and links.
6. **Front page & menus:** Settings → Reading → *A static page*. Appearance → Menus → assign menus to *Primary* and *Footer*.
7. **Preview user:** create a user with the **Editor** role (e.g. `preview-bot`), then Users → Profile → **Application Passwords** → create one. You'll paste it into Vercel. (Application Passwords require HTTPS on the WP site.)

Quick check: `https://gomostaging.com/ssl/wp-json/headless/v1/settings` and `https://gomostaging.com/ssl/wp-json/wp/v2/pages?acf_format=standard` should both return JSON, the latter with an `acf.sections` array.

## 2. Next.js (frontend) — local

Requires Node 20.9+.

```bash
cd frontend
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Value |
|---|---|
| `WORDPRESS_URL` | `https://gomostaging.com/ssl` (no trailing slash) |
| `SITE_URL` | optional — your site URL, e.g. `https://ssl.vercel.app`; defaults to the Vercel production URL. Not secret, no need to mark Sensitive |
| `REVALIDATE_SECRET` | same as `HEADLESS_REVALIDATE_SECRET` |
| `PREVIEW_SECRET` | same as `HEADLESS_PREVIEW_SECRET` |
| `WORDPRESS_PREVIEW_USER` | the preview user's username |
| `WORDPRESS_APP_PASSWORD` | the Application Password (spaces are fine, keep the quotes) |
| `WP_REVALIDATE_SECONDS` | optional, default `3600` |

> For the revalidation webhook and preview button to reach your machine during local dev, point `HEADLESS_FRONTEND_URL` at a tunnel (e.g. `ngrok http 3000`) on a local/staging WP — not on production.

## 3. Deploy to Vercel

1. Vercel → **Add New Project** → import `Development-gomo/ssl` → set **Root Directory** to `frontend` (framework is detected as Next.js).
2. Add all variables above under **Settings → Environment Variables** (Production; add Preview too if you use preview deployments, pointing at a staging WP if you have one).
3. Deploy, then add your domain and set `HEADLESS_FRONTEND_URL` in `wp-config.php` to it.
4. Test: edit a page in WP and update → refresh the live page. Click **Preview** on a draft → you should see the yellow preview banner.

`robots.ts` automatically blocks indexing on non-production Vercel deployments.

**Build note:** the build fetches all pages/posts for `generateStaticParams`. If WP is unreachable during a build it still succeeds and pages render on first request instead.

## 4. Extending

### Add a custom post type
1. Register it with `show_in_rest => true` and a `rest_base` (in the mu-plugin, your theme, or CPT UI/ACF — then delete the example `project` block).
2. Add it to `frontend/lib/config.ts`:
   ```ts
   export const POST_TYPES = {
     pages: { route: "" },
     posts: { route: "/blog" },
     projects: { route: "/projects" },
     services: { route: "/services" },   // ← new
   } as const;
   ```
3. Copy `app/projects/` to `app/services/` and change `"projects"` to `"services"` in both files.

Previews and revalidation pick it up automatically (they're keyed off `POST_TYPES`).

### Add an ACF layout
1. Add the layout to the flexible content field in ACF (e.g. name `testimonials`).
2. Create `components/blocks/Testimonials.tsx` — props are the layout's sub-field names.
3. Register it in `components/blocks/FlexibleContent.tsx`:
   ```ts
   const LAYOUTS = { hero: Hero, text_media: TextMedia, cta: Cta, testimonials: Testimonials };
   ```
   In development, layouts without a component show a red "Missing component" box; in production they're skipped.

### Other things you may want
- **Forms:** Contact Form 7 / Gravity Forms both have REST submit endpoints; post to them from a Server Action so no keys reach the browser.
- **Redirects:** export Yoast/Redirection rules into `next.config.ts` `redirects()`.
- **Tailwind / your design system:** replace `app/globals.css`.
- **Lock down the REST API** (optional): user enumeration via `/wp/v2/users` can be disabled with a small filter or a security plugin; the frontend doesn't need it.

## Troubleshooting

| Symptom | Check |
|---|---|
| `acf` is `[]` in REST responses | Field group → *Show in REST API* is off, or the post has no field values. |
| Images error with "hostname not configured" | `WORDPRESS_URL` must match the host serving `/wp-content/uploads/` (CDN offload? add its host to `next.config.ts` `remotePatterns`). |
| Updates don't appear | Check `HEADLESS_FRONTEND_URL` / secrets match; Vercel → Logs for `/api/revalidate` (401 = secret mismatch). Hosts that block outgoing requests will also block the webhook. |
| REST calls with an Application Password return `rest_not_logged_in` | The host strips the `Authorization` header. The bridge plugin (v1.1+) also accepts `X-Authorization`, which the frontend sends automatically. |
| Preview shows 404 | Cookie blocked (preview must be opened on the frontend domain), wrong `PREVIEW_SECRET`, or the Application Password user can't read drafts (use Editor role). |
| `/wp-json/` returns 404 | Permalinks set to *Plain*, or a security plugin is blocking the REST API. |
