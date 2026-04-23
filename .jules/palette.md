## 2024-04-14 - Icon-only modal close buttons missing ARIA labels
**Learning:** Icon-only modal close buttons (like the 3D preview and page picker close buttons) often miss `aria-label` and `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users. Even dynamically generated modals (like the zoom preview modal in `ModalManager.js`) need these attributes explicitly defined in their HTML template strings.
**Action:** Always ensure that icon-only interactive elements (`<button>`, `<a>`) have clear, descriptive `aria-label` and `title` attributes, regardless of whether they are hardcoded in the main HTML file or generated dynamically via JavaScript.

## 2024-04-14 - Inaccessible focus rings
**Learning:** Using `focus:outline-none` removes the default browser focus ring, making keyboard navigation difficult or impossible to track for interactive elements like buttons and upload boxes.
**Action:** Replace `focus:outline-none` with high-contrast, accessible focus indicators (e.g., `focus-visible:outline-4 focus-visible:outline-black focus-visible:outline-dashed focus-visible:outline-offset-4 focus-visible:!bg-yellow-300 focus-visible:!text-black`) to ensure clear visibility during keyboard navigation.
