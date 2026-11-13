# Basket

Shared household shopping list. Plain HTML/CSS/JS installable web app, Supabase backend, hosted on GitHub Pages.

- `index.html`, `app.js`, `styles.css`: the app
- `config.js`: Supabase project URL, public key, household login email
- `i18n.js`: translations (English, Brazilian Portuguese)
- `sw.js`: offline app shell and update prompt (bump `VERSION` on each release)
- `supabase/schema.sql`: tables, security rules, starting shops and categories
- `supabase/002_photos.sql` … `005_currency.sql`: later updates, run once each in order
- `.github/workflows/keepalive.yml`: pings the database every 3 days so the free project never pauses

First-time setup: see `SETUP.md`. How to use it: see `GUIDE.md` (Português: `GUIDE.pt-BR.md`).
