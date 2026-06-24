## 2026-06-14 - Optimize PDF Import Rendering Performance
**Learning:** Sequential processing in asynchronous workflows (`renderPage`, `canvasToBlob` inside a `for` loop) causes an N+1 query bottleneck. Parallelizing with `Promise.all` alongside a sliding window concurrency limit speeds up PDF rendering drastically without causing memory spikes or UI stutter.
**Action:** Use a bounded concurrent pool (like a `Set` with `Promise.race`) when dealing with expensive bulk UI/canvas generation loops (e.g. `processPdfUpload`).
