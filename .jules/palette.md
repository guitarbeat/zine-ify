## 2024-04-14 - Icon-only modal close buttons missing ARIA labels
**Learning:** Icon-only modal close buttons (like the 3D preview and page picker close buttons) often miss `aria-label` and `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users. Even dynamically generated modals (like the zoom preview modal in `ModalManager.js`) need these attributes explicitly defined in their HTML template strings.
**Action:** Always ensure that icon-only interactive elements (`<button>`, `<a>`) have clear, descriptive `aria-label` and `title` attributes, regardless of whether they are hardcoded in the main HTML file or generated dynamically via JavaScript.

## 2026-06-12 - Explicit Labels for Visual Grid & Preset Components
**Learning:** When building visual interactive grids (like the PDF page picker thumbnails) or preset constraint chips ("First 8", "Odd", "Even"), the contextual text or internal image alt-text is often insufficient for robust screen reader navigation. Users rely heavily on explicit `aria-label` attributes to understand the exact action (e.g., "Select page 1" instead of just hearing the image alt text).
**Action:** Always ensure that interactive buttons wrapping complex media or acting as layout presets have explicit, action-oriented `aria-label`s defined during DOM construction.
