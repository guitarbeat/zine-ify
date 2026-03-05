## 2026-03-05 - DOM-based XSS in Zine UI Layout Generation
**Vulnerability:** Unsanitized dynamic values (labels, page numbers) were being interpolated directly into `innerHTML` templates during layout generation in `src/js/zine-ui.js`.
**Learning:** Even internal state variables (like page numbers or sheet labels) should not be blindly interpolated into HTML strings if there's any chance they could be influenced by user data or file metadata. This application creates a lot of DOM elements dynamically based on user selection or PDF parsing.
**Prevention:** Construct static HTML scaffolds with `innerHTML` or `document.createElement` and securely inject dynamic values using properties like `textContent` and `setAttribute`, avoiding direct template literal interpolation.
