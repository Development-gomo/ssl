# SSL — Headless WordPress + Next.js

**Backend (WordPress + WPML):** https://gomostaging.com/ssl · **Frontend:** Next.js 16 (App Router, JSX, Tailwind v4) on Vercel

**Languages:** Swedish (default, no prefix: `/blogg/…`) and English (`/en/blog/…`).

Same structure and conventions as the Caspeco headless site.

```
├── public/                              static files (icons, images)
├── src/
│   ├── app/
│   │   ├── layout.js                    <html>/<body>, font, body class (page type)
│   │   ├── globals.css                  Tailwind v4 + brand tokens + .ssl-content (WP editor HTML)
│   │   ├── error.jsx, not-found.jsx     global error / 404
│   │   ├── robots.js, sitemap.js
│   │   ├── [lang]/
│   │   │   ├── layout.js                pass-through
│   │   │   ├── not-found.jsx            404 inside the site shell
│   │   │   ├── page.jsx                 home = WP static front page (else latest posts)
│   │   │   └── [slug]/
│   │   │       ├── page.jsx             top-level page (/about) or archive (/blog, /projects)
│   │   │       └── [...rest]/page.jsx   single entry (/blog/x, /projects/x) or child page (/about/team)
│   │   ├── api/
│   │   │   ├── revalidate/route.js      webhook WordPress calls on save
│   │   │   ├── content/[...path]/route.js  same-origin WP REST proxy for the browser
│   │   │   ├── wp-redirects/route.js    redirects from the WP "Redirection" plugin
│   │   │   ├── preview/route.js         WP "Preview" button → draft mode
│   │   │   └── exit-preview/route.js
│   │   └── preview/[type]/[id]/page.jsx draft preview (never cached/indexed)
│   ├── components/
│   │   ├── LangSyncer.jsx               keeps <html lang> + body class in sync on navigation
│   │   ├── major/                       Header, Footer, PageBuilder (ACF flexible content)
│   │   ├── templates/                   Shell, EntryTemplate, PostTemplate, ArchiveTemplate
│   │   ├── sections/                    one component per ACF layout (home/, inner-pages/)
│   │   └── ui/                          CtaButton, PostCard, LanguageSwitcher
│   ├── config/index.js                  languages (sv, en), ROUTE_TYPES (URL base per content type and language)
│   ├── lib/
│   │   ├── api.js                       every WordPress REST call (fetchWP …)
│   │   ├── wpMask.js                    hides the WP host, renames acf_fc_layout → _layout, yoast_head_json → seo
│   │   ├── seo.js                       metadata from Yoast
│   │   ├── content.js                   ACF field helpers
│   │   ├── postStrings.js               UI text per language (cards, listings, post template)
│   │   ├── params.js, notFoundMessages.js
│   └── proxy.js                         robots.txt, WP redirects, x-lang / x-page-type headers
├── wordpress/
│   ├── headless-bridge.zip              bridge plugin (Plugins → Add New → Upload)
│   ├── headless-bridge/headless-bridge.php
│   └── acf-page-builder-import.json     ACF "Page builder" field group (ACF → Tools → Import)
├── next.config.mjs, jsconfig.json, eslint.config.mjs, postcss.config.mjs
└── .env.example
```

## How it works

| Flow | What happens |
|---|---|
| **Visitor** | `next.config.mjs` rewrites `/x` → `/en/x` (default language has no prefix). Pages render on the server; WordPress responses are cached (`fetchWP`, 60 s) and masked so the WP host never reaches the browser. |
| **Editor saves in WP** | Bridge plugin → `POST /api/revalidate` → the changed post's page + its archive + home (posts/CPTs), or the whole site (pages, menus, settings). The next visit shows the change. |
| **Editor clicks Preview** | `/api/preview?secret&id&type` → draft mode cookie → `/preview/{type}/{id}` reads the draft/autosave with the Application Password. |
| **Redirects** | Managed in WP with the Redirection plugin (optional); `src/proxy.js` applies them. |

SiteGround specifics (already handled): requests send the `wpSGCacheBypass` cookie so SiteGround's cache never serves stale JSON, and the Application Password goes in `X-Authorization` too because SiteGround strips `Authorization`.

## Content model

**Pages** — WordPress pages, nested pages supported (`/about/team`).
**Content types** — `ROUTE_TYPES` in `src/config/index.js`:

| Type | WP REST base | Swedish | English |
|---|---|---|---|
| `post` | `posts` | `/blogg`, `/blogg/{slug}` | `/en/blog`, `/en/blog/{slug}` |
| `project` | `projects` (CPT from the bridge plugin) | `/projekt`, `/projekt/{slug}` | `/en/projects`, `/en/projects/{slug}` |

A WordPress page with the same slug as a base (e.g. a page called "blog") takes over the archive URL.

**ACF Page builder** — flexible content field `page_builder` on pages, posts and projects. Layouts → components (`src/components/major/PageBuilder.jsx`):

| ACF layout | Component | Fields |
|---|---|---|
| `hero_section` | `sections/home/HomeHero.jsx` | heading, text, image, button |
| `text_media_section` | `sections/inner-pages/TextMedia.jsx` | heading, content, image, image_position |
| `cta_section` | `sections/inner-pages/CtaSection.jsx` | heading, text, button |

### Add an ACF layout
1. Add the layout to the *Page builder* field group in ACF (e.g. `testimonials_section`).
2. Create `src/components/sections/…/Testimonials.jsx` — it receives `{ data, lang }` (`data` = the layout's fields).
3. Import it in `PageBuilder.jsx` and add a `case "testimonials_section":`.

### Add a custom post type
1. Register it in WordPress with `show_in_rest => true` and a `rest_base`.
2. Add it to `ROUTE_TYPES` in `src/config/index.js`, e.g. `service: { rest: "services", base: { sv: "tjanster", en: "services" }, label: { sv: "Tjänster", en: "Services" } }`, and make it translatable in WPML.
3. Optional: a dedicated template in `src/components/templates/` and a `case` in `[...rest]/page.jsx` (otherwise `EntryTemplate` is used).

## Languages (WPML)

- WPML default language **Swedish** = `NEXT_PUBLIC_DEFAULT_LANG=sv` (no URL prefix); English under `/en`. WPML URL format: *languages in directories*.
- Every WP request carries `lang=`; the bridge plugin returns menus, front page and site title per language (`/headless/v1/settings?lang=en`) and adds `lang` + `translations` to every entry.
- The header's **SV / EN switcher** links to the same page in the other language (via `translations`), or to that language's home when there is no published translation. The same data produces `hreflang` links.
- Untranslated content is **not** shown under the other language (WPML's fallback is ignored) — `/en/blog/x` is a 404 until the English translation is published.
- Menus: create one per language in WPML (or *WPML → WP Menus Sync*) and assign it to *Primary* / *Footer*.
- UI text that doesn't come from WordPress lives in `src/lib/postStrings.js` and `src/lib/notFoundMessages.js`.

### Add a language
1. Add it in WPML.
2. `src/config/index.js`: add the code to `SUPPORTED_LANGS`, `LOCALE_MAP`, `LANG_LABELS`, and a `base` + `label` per `ROUTE_TYPES` entry.
3. Add its strings to `src/lib/postStrings.js` and `src/lib/notFoundMessages.js`.

## Local development

Node 20.9+.

```bash
cp .env.example .env.local   # fill in
npm install
npm run dev                  # http://localhost:3000
npm run lint
```

## Vercel

- **Root Directory:** leave **empty** (the app is at the repo root — no `frontend/` folder).
- **Environment variables:**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_WP_BASE` | `https://gomostaging.com/ssl/wp-json` |
| `NEXT_PUBLIC_DEFAULT_LANG` | `sv` |
| `SITE_URL` | optional, e.g. `https://sslsite.vercel.app` (defaults to the production domain) |
| `REVALIDATE_SECRET` | same as `HEADLESS_REVALIDATE_SECRET` in wp-config.php |
| `PREVIEW_SECRET` | same as `HEADLESS_PREVIEW_SECRET` in wp-config.php |
| `WP_API_USER` | WordPress username for previews (e.g. `Gomo_dev`) |
| `WP_API_PASS` | that user's Application Password |

The older names `WORDPRESS_URL`, `WORDPRESS_PREVIEW_USER` and `WORDPRESS_APP_PASSWORD` still work as fallbacks.
`/robots.txt` blocks indexing on Vercel preview deployments automatically.

## WordPress setup

1. Settings → Permalinks → *Post name*.
2. Plugins: **ACF Pro**, **WPML** (+ String Translation, ACF Multilingual), **Headless Bridge** v1.2+ (`wordpress/headless-bridge.zip`), optionally Yoast SEO and Redirection.
3. `wp-config.php`:
   ```php
   define( 'HEADLESS_FRONTEND_URL', 'https://sslsite.vercel.app' );
   define( 'HEADLESS_REVALIDATE_SECRET', '…' );
   define( 'HEADLESS_PREVIEW_SECRET', '…' );
   ```
4. ACF → Tools → Import → `wordpress/acf-page-builder-import.json`.
5. Settings → Reading → static front page; Appearance → Menus → *Primary* and *Footer*.

## Troubleshooting

| Symptom | Check |
|---|---|
| Saving in WP doesn't update the site | `HEADLESS_FRONTEND_URL` and the secrets match; Vercel → Logs for `/api/revalidate` (401 = secret mismatch). |
| `acf` is `[]` in REST responses | The field group's *Show in REST API* is off, or the entry has no field values. |
| Preview shows 404 | `WP_API_USER` / `WP_API_PASS` wrong, or the cookie was blocked (open the preview on the frontend domain). |
| REST calls with an Application Password return `rest_not_logged_in` | The host strips `Authorization`; the bridge plugin (v1.1+) also reads `X-Authorization`, which the frontend sends. |
| Unknown ACF layout shows a red box (dev only) | Add its component to `PageBuilder.jsx`. |
