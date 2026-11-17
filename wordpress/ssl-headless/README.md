# SSL Headless (WordPress theme)

Standalone theme for the headless SSL site, generated from [Underscores (_s)](https://underscores.me/)
(prefix `ssl_headless_`, text domain `ssl-headless`). Visitors never see it — Next.js renders the
site — but it powers the WordPress admin and keeps site-specific setup in Git:

- `acf-json/` — ACF field groups (loaded and saved here; ACF shows "Sync available" after a deploy)
- `inc/headless.php` — ACF local JSON paths, image sizes (`card`, `hero`), comments off, admin notice
- Menu locations (`primary`, `footer`) and the Next.js connection live in the Headless Bridge plugin

The rest is the Underscores starter (templates, `sass/`, `js/`, `package.json` build scripts) in case
WordPress ever needs to render something itself. Install: zip this folder → Appearance → Themes →
Upload → Activate.
