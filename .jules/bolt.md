## 2024-05-24 - Async Pool vs Batched Promise.all
**Learning:** In JavaScript, chunking async tasks into discrete batches using `Promise.all(batch)` causes "stuttering" - fast tasks must wait for the slowest task in the batch to finish before the next batch starts, leaving resources idle.
**Action:** Use a sliding window promise pool (`Array(limit).fill().map(async () => { while(tasks) { await nextTask(); } })`) to ensure maximum concurrency at all times, especially for variable-duration tasks like PDF page rendering.
