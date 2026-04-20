## 2024-04-14 - Icon-only modal close buttons missing ARIA labels
**Learning:** Icon-only modal close buttons (like the 3D preview and page picker close buttons) often miss `aria-label` and `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users. Even dynamically generated modals (like the zoom preview modal in `ModalManager.js`) need these attributes explicitly defined in their HTML template strings.
**Action:** Always ensure that icon-only interactive elements (`<button>`, `<a>`) have clear, descriptive `aria-label` and `title` attributes, regardless of whether they are hardcoded in the main HTML file or generated dynamically via JavaScript.

## 2024-05-18 - Improve Keyboard Focus Visibility
**Learning:** Suppressing focus outlines with `focus:outline-none` harms accessibility for keyboard users, making it impossible to see which element is currently focused.
**Action:** Always use high-contrast focus rings (like `focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-dashed ...`) for interactive elements instead of disabling focus outlines entirely.
