## 2024-03-20 - Prevent UI Stuttering with Sliding Window Worker Pool
**Learning:** Using discrete batched `Promise.all` for parallel operations (like rendering PDF pages) causes "stuttering". The system waits for the slowest task in the batch to finish before starting the next batch, leading to uneven CPU utilization and jerky progress updates.
**Action:** Replace discrete batching loops with a sliding window worker pool pattern (e.g., using a concurrency limit and maintaining active workers) to ensure continuous processing and smoother UI updates.
