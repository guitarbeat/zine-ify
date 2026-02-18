## 2024-05-22 - Accessibility for Dynamic Notifications
**Learning:** Toast notifications (dynamic content updates) are silent to screen readers unless wrapped in a container with `aria-live="polite"` and `aria-atomic="true"`.
**Action:** Always wrap dynamic notification areas with these attributes. Ensure close buttons in these notifications have `aria-label`.

## 2024-05-22 - Keyboard Shortcut Discoverability
**Learning:** Keyboard shortcuts are powerful but invisible. Adding them to `title` attributes (e.g., "Print (Ctrl+P)") and using `aria-keyshortcuts` makes them discoverable and accessible to screen reader users without cluttering the UI.
**Action:** When implementing keyboard shortcuts, always update the UI element's `title` and add `aria-keyshortcuts`.

## 2024-05-22 - Focus Style Specificity Override
**Learning:** CSS specificity conflicts between custom component classes (e.g., `.upload-box`) and utility classes (e.g., Tailwind's `bg-yellow-300`) can prevent focus styles from applying correctly. In this case, `.upload-box` defined a background color that overrode the focus utility.
**Action:** Used `!important` modifiers (e.g., `focus:!bg-yellow-300`) to ensure accessibility focus styles are visible and take precedence without requiring a full refactor of the existing CSS architecture.

## 2026-02-16 - Dynamic Toast Roles
**Learning:** Using `role="alert"` for all toasts is aggressive. Errors should use `role="alert"` (assertive), while success/info messages should use `role="status"` (polite) within an `aria-live="polite"` container.
**Action:** Dynamically assign roles based on message type in notification components.

## 2026-02-16 - Form Accessibility: Label Association
**Learning:** Visual proximity of labels to inputs does not guarantee accessibility. Missing `for` attributes on `label` elements breaks screen reader announcements and click-to-focus behavior.
**Action:** Always verify label associations using automated tools or by clicking the label to ensure focus shifts to the input.
