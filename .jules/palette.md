## 2024-04-14 - Icon-only modal close buttons missing ARIA labels
**Learning:** Icon-only modal close buttons (like the 3D preview and page picker close buttons) often miss `aria-label` and `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users. Even dynamically generated modals (like the zoom preview modal in `ModalManager.js`) need these attributes explicitly defined in their HTML template strings.
**Action:** Always ensure that icon-only interactive elements (`<button>`, `<a>`) have clear, descriptive `aria-label` and `title` attributes, regardless of whether they are hardcoded in the main HTML file or generated dynamically via JavaScript.

## 2024-06-14 - Localized Loading States and Disabled Button Accessibility
**Learning:** Screen readers need localized loading states (e.g. `aria-busy="true"` on the export trigger button) and synchronized `aria-disabled` attributes for buttons that use the `disabled` property, otherwise the loading state or disabled state might not be accurately conveyed dynamically.
**Action:** Always sync the `aria-disabled` attribute with the DOM element's `disabled` state programmatically (e.g., `btn.setAttribute('aria-disabled', String(isDisabled))`) and provide `aria-busy` feedback for long-running operations.
