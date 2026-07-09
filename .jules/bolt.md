## 2026-07-09 - [Optimize Zine3DViewer O(N) lookup]
**Learning:** Found an `Array.find` inside a high-frequency rendering loop (`createSeams`) searching an array (`this.pages`) where the matching object's `id` perfectly mapped to its array index (1-8 vs 0-7).
**Action:** Replaced `this.pages.find((page) => page.id === from)` with direct array lookup `this.pages[from - 1]`. Direct array access cut the simulated overhead of the lookup by more than half compared to iteration. Always check if an `id` can be mapped directly to an array index or `Map` to avoid O(N) lookups in tight loops.
