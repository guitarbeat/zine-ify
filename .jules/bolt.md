## 2024-05-15 - Sliding Window Worker Pool for PDF Processing
**Learning:** Using batched `Promise.all` for processing multiple PDF pages causes "stuttering" in the UI because the batch waits for the slowest promise to complete before starting the next batch, leading to bursts of work and idle time.
**Action:** Use a sliding window worker pool pattern (e.g., managing a `Set` of active promises up to a concurrency limit and using `Promise.race`) to maintain a constant stream of processing, preventing UI stuttering and utilizing resources more evenly. Ensure errors in the sliding window are explicitly propagated to preserve fail-fast behavior.

## 2024-06-12 - Memory Management in PDF.js Page Rendering
**Learning:** When using `pdfjs-dist` to render pages to a canvas, internal resources and caches associated with the `PDFPageProxy` instance are not automatically released immediately. This causes significant memory bloat, especially during multi-page processing.
**Action:** Explicitly call `page.cleanup()` after `await page.render().promise` to release these internal resources and caches.
