## 2026-01-10 - Duplicate Script Execution
**Learning:** I discovered that including the main logic script (`assets/app.js`) via a `<script>` tag AND having the same logic inline in `index.html` causes the code to execute twice. This leads to subtle bugs like duplicate DOM elements (found by `locator.count()`) or race conditions, and doubles the processing work.
**Action:** Always check `index.html` for inline scripts that might duplicate external script references. When optimizing, verify if external scripts are actually used or redundant. In this case, removing the redundant `<script src="...">` fixed both visual glitches and performance overhead.

## 2026-01-10 - Blobs vs Data URLs
**Learning:** Switching from `canvas.toDataURL()` (synchronous, main-thread blocking) to `canvas.toBlob()` (asynchronous) significantly improved UI responsiveness during heavy processing. However, `toBlob` is async, so it must be wrapped in a Promise when used inside an `await` loop to ensure sequential processing if order matters (or to manage concurrency).
**Action:** Use `canvas.toBlob` for image generation in performance-critical paths, especially for large images or loops. Remember to handle the asynchronous nature and revoke Object URLs to avoid memory leaks.

## 2026-01-21 - Efficient PDF Loading
**Learning:** Reading a large PDF into an `ArrayBuffer` using `FileReader` (via `readFileAsArrayBuffer`) creates a massive memory spike and blocks the thread, even though `FileReader` is async-ish. PDF.js can accept a `url` parameter pointing to a Blob URL (created via `URL.createObjectURL(file)`). This allows PDF.js to handle the file streaming/loading internally, significantly improving initial load time and reducing memory usage for large files (tested: ~20% faster).
**Action:** When loading user-provided files for libraries that support URL inputs (like PDF.js), prefer `URL.createObjectURL(file)` over reading the file into JS memory. Always remember to `revokeObjectURL` when done.

## 2026-01-21 - Canvas Reuse Optimization
**Learning:** Recreating a `<canvas>` element for every page rendered (in a loop) triggers heavy DOM manipulation and Garbage Collection, slowing down processing significantly (especially for large PDFs).
**Action:** Use a single shared `<canvas>` instance (e.g., as a class property) and resize/clear it (`canvas.width = ...`) for each render operation instead of creating/destroying elements. This yielded a ~15% performance gain (~400ms on a 16-page PDF).

## 2026-02-05 - Debouncing Grid Updates
**Learning:** Frequent DOM updates triggered by input events (e.g., typing "10" triggers updates for "1" then "10") can cause significant thrashing. Implementing a debounce on the input listener reduced  calls from 3 to 1 for a simple 2-digit input.
**Action:** Always wrap high-frequency event handlers (like  or ) with  or  if they trigger expensive operations (like DOM rebuilding).

## 2026-02-05 - Debouncing Grid Updates
**Learning:** Frequent DOM updates triggered by input events (e.g., typing "10" triggers updates for "1" then "10") can cause significant thrashing. Implementing a debounce on the input listener reduced `generateCustomGrid` calls from 3 to 1 for a simple 2-digit input.
**Action:** Always wrap high-frequency event handlers (like `input` or `scroll`) with `debounce` or `throttle` if they trigger expensive operations (like DOM rebuilding).
