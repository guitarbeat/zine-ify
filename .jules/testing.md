## 2026-05-12 - [Unit testing UI components with Playwright]
**Learning:** Testing UI components in the vanillajs `tests/unit` environment requires injecting DOM context when components use `innerHTML` and `addEventListener`. Playwright's `page.evaluate` has complexities resolving local dynamic imports on Vite without proper test harness servers.
**Action:** Used `jsdom` added to Node's `global` scope in a setup hook instead to allow synchronous isolated testing for pure UI orchestrators.
