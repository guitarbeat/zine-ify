## 2026-05-15 - E2E Testing for Print Error Handling

**Learning:** E2E testing for functions that show error toasts based on internal mock failures requires exposing the mocked object correctly on `window.app` and successfully triggering the event via UI interactions. Also discovered `jsPDF` usage to construct dummy valid files to bypass early validation guards.

**Action:** Ensure tests that depend on specific validation states (like `getFilledPageCount() > 0`) properly seed those states before mocking the target function.