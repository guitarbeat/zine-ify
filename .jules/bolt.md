## 2024-05-15 - Sliding Window Worker Pool for PDF Processing
**Learning:** Using batched `Promise.all` for processing multiple PDF pages causes "stuttering" in the UI because the batch waits for the slowest promise to complete before starting the next batch, leading to bursts of work and idle time.
**Action:** Use a sliding window worker pool pattern (e.g., managing a `Set` of active promises up to a concurrency limit and using `Promise.race`) to maintain a constant stream of processing, preventing UI stuttering and utilizing resources more evenly. Ensure errors in the sliding window are explicitly propagated to preserve fail-fast behavior.
## 2024-05-17 - PDF.js Memory Management Optimization
**Learning:** Rendering pages with `pdfjs-dist` via `page.render()` caches internal page data on the `PDFPageProxy` object, which accumulates over time and can cause severe memory leaks when processing large or multi-page PDFs.
**Action:** Always call `page.cleanup()` in a `finally` block after rendering the page to manually release these internal resources.
