## 2026-06-24 - Sequential PDF Image Rendering

**Learning:** In `src/services/ExportService.js`, rendering PDF sheets with `await Promise.all` across all high-DPI image slots concurrently consumed massive amounts of memory (30MB+ per sheet), causing OOM crashes on lower-end devices or large PDFs.
**Action:** Always process high-DPI sheet canvases sequentially (e.g., using `await` inside a `for` loop) rather than concurrently to keep memory usage flat.
