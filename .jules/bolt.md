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

## 2025-02-27 - Background Rendering Bottleneck using HTMLCanvasElement
**Learning:** Processing PDFs or rendering graphics in the background using `document.createElement('canvas')` unnecessarily interacts with the DOM and can block the main thread.
**Action:** Prefer `OffscreenCanvas` over `document.createElement('canvas')` for background rendering tasks to avoid DOM interactions and reduce main thread blocking. Always provide a fallback to `HTMLCanvasElement` for unsupported browsers. When retrieving blob data from `OffscreenCanvas`, use the native asynchronous `convertToBlob()` method instead of the callback-based `toBlob()` method.