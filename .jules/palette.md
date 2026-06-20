## 2024-04-14 - Icon-only modal close buttons missing ARIA labels
**Learning:** Icon-only modal close buttons (like the 3D preview and page picker close buttons) often miss `aria-label` and `title` attributes, making them inaccessible to screen readers and lacking tooltips for mouse users. Even dynamically generated modals (like the zoom preview modal in `ModalManager.js`) need these attributes explicitly defined in their HTML template strings.
**Action:** Always ensure that icon-only interactive elements (`<button>`, `<a>`) have clear, descriptive `aria-label` and `title` attributes, regardless of whether they are hardcoded in the main HTML file or generated dynamically via JavaScript.

## 2024-06-20 - Global progress modal isn't enough context for long actions
**Learning:** While global progress modals are helpful for overall async operations, relying solely on them without updating the state of the trigger element can lead to confusion and lack of immediate feedback on where the action originated from.
**Action:** When working on long-running async tasks like PDF generation or file imports, provide localized loading states directly on the trigger element (e.g. `aria-busy="true"`, `disabled`, and inline text/spinners) so screen readers and users immediately know the specific interaction has started processing.
