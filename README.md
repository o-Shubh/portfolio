# Shubham Chandel — Portfolio

Static HTML, CSS and vanilla JavaScript. No framework, package install, or runtime backend required. GitHub Pages serves the committed `index.html` directly.

## Run locally

From this folder, with Python 3 installed:

```sh
python build.py
python -m http.server 4173
```

Open http://localhost:4173/. Use an HTTP server, not a file:// URL, because the interactions load `content.json`.

## Edit content

Edit **content.json**, then run `python build.py` and commit both the configuration and generated files. This is the single source for names, roles, links, stats, testimonials, video selections, section copy and interface labels. `sections` contains the preserved HTML copy; retain its section IDs to keep existing links working. Theme colors, spacing and radii are tokens at the top of `theme.css`.

- `stats`: Set `value` to a real number, or leave `null` to show an em dash. Update `note` and `suffix`. No load or team counts are invented. The years count is editable, not automatically calculated.
- `videos`: Add objects with `id` (the 11-character YouTube video ID), `title` and optional `description`. Put newest videos first. This is a curated list, not an automatic YouTube feed. Videos load only after a visitor clicks Play.
- `testimonials`: Add approved objects with `quote`, `name`, and `role`. Two or more entries enable the keyboard-operable carousel. Empty arrays show honest empty states.
- `formEndpoint`: Empty by default. The form validates and opens a mailto draft; the visitor must send it in their email app. For direct submission, supply an HTTPS service accepting JSON `{name,email,message}` and permitting requests from this domain. A 2xx response means success. Configure spam protection at the service. Do not put API keys in this public file.
- `resume`, `whatsapp`, `email`, `youtube`, `links`: Edit destination values here. The supplied résumé is the original 2025 PDF; it is not silently rewritten.
- `seo`: Edit title, description, and canonical URL. Keep a trailing slash on the URL. The build also generates robots.txt and sitemap.xml.

Keep the original image files for existing URLs and social previews. The page uses smaller WebP copies. All original section anchors remain available, including `#exploring`, which now contains professional learning copy.

## Verification

`verify.cjs` uses an existing Playwright installation and Microsoft Edge. It runs against http://127.0.0.1:4180/ by default; set `PORTFOLIO_URL` to override. Start a local server on port 4180, then run `node verify.cjs` with Playwright on `NODE_PATH`. It checks four viewports, themes, modal focus, validation, anchors, résumé, no-JavaScript rendering and mocked contact responses. It never sends real messages.

Tested widths: 360, 768, 1024 and 1440 pixels. Reduced-motion support disables visual motion and keeps text visible. Google Fonts use `display=swap` with local fallback fonts. Lighthouse is a target, not a measured score in this delivery; external fonts, hosting and network conditions affect results.

## Publish

Commit the generated files and push to `main`. Repository Settings → Pages should use **Deploy from a branch**, `main`, `/ (root)`. Hosting works at https://o-shubh.github.io/portfolio/ without a custom domain.
