## 2024-03-10 - Sliding Window Worker Pool for PDF Processing
**Learning:** Using discrete `Promise.all` batching for PDF page rendering creates "stuttering". If one page in a batch takes significantly longer to render than the others, the entire pool stalls waiting for it, leaving other processing slots idle.
**Action:** Replaced discrete batching with a sliding window concurrency pattern using `Set` and `Promise.race`. This ensures that exactly N (e.g., 4) tasks are always running, maximizing resource utilization and providing a smoother loading experience.
