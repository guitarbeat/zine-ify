# Zine-ify

A client-side PWA that converts PDFs into printable 8-page mini zine layouts. No backend services or databases.

## Agent configs

Automated agent workflows and learnings live in [`agents/`](agents/README.md):

- **Bolt** — performance (`agents/bolt.md`)
- **Palette** — UX/a11y (`agents/palette.md`)
- **Sentinel** — security (`agents/sentinel.md`)
- **Testing** — test authoring (`agents/testing.md`)
- **Workflows** — repeatable procedures (`agents/workflows/`)

## Cursor Cloud specific instructions

### Services

| Service | Command | Port |
|---------|---------|------|
| Dev server | `pnpm dev` | 5000 |

### Key commands

See `package.json` `scripts` for the full list. Highlights:

- **Lint:** `pnpm lint` (lints `src/`)
- **Build:** `pnpm build`
- **Dev server:** `pnpm dev` (Vite, port 5000, host 0.0.0.0)
- **Tests:** `pnpm test` (Playwright — builds first, serves on port 8001)

### Gotchas

- The Playwright `webServer` command in `playwright.config.js` calls `python -m http.server`. On environments where only `python3` is available, ensure a `python` symlink exists: `sudo ln -sf /usr/bin/python3 /usr/local/bin/python`.
- Playwright tests require Chromium: run `pnpm exec playwright install --with-deps chromium` if browsers are not yet installed.
- Some e2e tests (3D preview, mobile layout, mixed uploads, multi-file queue) have pre-existing failures unrelated to environment setup.
- The test PDF generator script is at `scripts/create_test_pdf.js` — run with `node scripts/create_test_pdf.js` to create a sample 16-page PDF for manual testing.