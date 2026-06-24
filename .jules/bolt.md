## 2024-05-15 - Sliding Window Worker Pool for PDF Processing
**Learning:** Using batched `Promise.all` for processing multiple PDF pages causes "stuttering" in the UI because the batch waits for the slowest promise to complete before starting the next batch, leading to bursts of work and idle time.
**Action:** Use a sliding window worker pool pattern (e.g., managing a `Set` of active promises up to a concurrency limit and using `Promise.race`) to maintain a constant stream of processing, preventing UI stuttering and utilizing resources more evenly. Ensure errors in the sliding window are explicitly propagated to preserve fail-fast behavior.

## 2024-06-12 - Memory Management in PDF.js Page Rendering
**Learning:** When using `pdfjs-dist` to render pages to a canvas, internal resources and caches associated with the `PDFPageProxy` instance are not automatically released immediately. This causes significant memory bloat, especially during multi-page processing.
**Action:** Explicitly call `page.cleanup()` after `await page.render().promise` to release these internal resources and caches.

## 2024-07-25 - DOM Query Caching for Grid Operations
**Learning:** O(n^2) DOM querying bottlenecks during grid operations in `src/js/zine-ui.js` (e.g. `querySelectorAll` in `updatePagePreview`) degrade performance.
**Action:** Cache `.page-cell` element lookups in a `_pageCellsCache` Map grouped by `data-page-index`. Invalidate this cache (`this._pageCellsCache = null`) during layout regenerations.

## 2025-02-18 - Repeated DOM Parsing Bottleneck in Grid Generation
**Learning:** Repeatedly setting `.innerHTML` inside a loop (e.g., when generating custom grid layouts) causes significant performance overhead because the browser has to parse the HTML string and construct the DOM fragment on every iteration. This creates a noticeable bottleneck when generating larger grids (like 10x10).
**Action:** Implement the Template/Flyweight pattern using a `<template>` element. Create the structure once in `template.innerHTML`, and inside the loop, use `element.replaceChildren(template.content.cloneNode(true))` to safely and quickly duplicate the DOM structure without repeated parsing.

## 2025-02-23 - Main Thread Offloading with OffscreenCanvas
**Learning:** Rendering complex PDF pages or generating blank layouts using `document.createElement('canvas')` executes on the main thread, leading to potential UI blocking and stuttering, especially when processing multiple pages rapidly in background tasks.
**Action:** Use `OffscreenCanvas` instead of standard DOM canvases where available (e.g., in PDF.js rendering loops and blank page generation) to allow asynchronous rendering without blocking the main UI thread. Ensure a fallback to `document.createElement('canvas')` for unsupported environments. Use `.convertToBlob()` for OffscreenCanvases in place of standard canvas `.toBlob()`.

## 2026-04-23 - Redundant Array Traversal in Layout Rendering
**Learning:** Traversing the same array multiple times in succession to update different UI aspects (previews, flips, zooms) increases CPU cycles and overhead, especially as the number of pages grows.
**Action:** Consolidate multiple loops over the same collection into a single iteration. This reduces traversal overhead and improves cache locality, resulting in a measurable performance boost (approx. 11% in micro-benchmarks).

## 2026-05-15 - Redundant Stack Finding in Loop Optimization

**Learning:** Using `Array.prototype.find()` inside loops that execute frequently (such as on every frame in a 3D animation loop `setFoldProgress` or `updateSeams`) results in O(N*M) time complexity. This causes unnecessary overhead, even when arrays are small. When array indices map perfectly to sequential indexes (0, 1, 2...), the search can be fully replaced by direct array indexing `arr[index]`. A microbenchmark comparing `array.find(obj => obj.index === id)` vs `array[id]` demonstrated a ~34% speed improvement over 10 million iterations.

**Action:** Whenever possible, avoid `Array.prototype.find()` or `filter()` inside high-frequency functions. Pre-calculate mapping using direct indexing, Maps, or object references to ensure O(1) lookups for data that maps sequentially.
## 2024-05-20 - Toast Component Cloning Optimization
**Learning:** Repetitive UI components like Toast notifications constructed using multiple `document.createElement()` and property assignment calls cause unnecessary DOM processing overhead and memory allocation, especially when an object like `icons` is recreated on every invocation.
**Action:** Extract static dictionary objects into module-level constants to save memory allocation, and use HTML `<template>` combined with `cloneNode(true)` to build repetitive elements instantly, minimizing layout thrashing and function call overhead.
## 2026-06-18 - Repeated DOM Querying in Event Handlers
**Learning:** Frequent DOM queries via `querySelector` in event handlers or tight loops (e.g., fetching `.page-cell` elements by index in `UIManager`) can cause unnecessary O(n) performance degradation, especially as grid complexity increases.
**Action:** Implement DOM Caching using a `Map` during the initial query to transform subsequent lookups from O(n) to O(1). Be sure to invalidate the cache when the DOM structure is rebuilt (e.g., during layout generation).

## 2025-03-01 - O(n) Array Lookups in React Render Loop Bottleneck
**Learning:** Using `Array.find` or `Array.findIndex` inside React render functions and high-frequency callbacks causes unnecessary O(n) CPU overhead, which degrades performance when state updates trigger frequent re-renders. Even for small static lists, the overhead adds up compared to direct indexing.
**Action:** When a React component relies on static lists (like an array of step definitions), pre-compute an O(1) hash map or index mapping outside the component to replace O(n) lookups during rendering and state updates.
