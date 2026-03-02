## 2024-05-24 - [XSS in Dynamic HTML Generation]
**Vulnerability:** DOM-based XSS in the `Toast` component due to direct interpolation of user input into `innerHTML`.
**Learning:** Even internal utility components like `Toast` can be vectors for XSS if they treat input as HTML by default, especially when developers might unknowingly pass unsanitized strings (like filenames).
**Prevention:** Use `textContent` for dynamic content or safer alternatives like `document.createElement` to ensure all user input is treated as text, not HTML. Only use `innerHTML` for trusted, static content.

## 2026-03-02 - [XSS in Dynamic Grid UI generation]
**Vulnerability:** DOM-based XSS in UI generation (such as grid layout and label generation in `src/js/zine-ui.js`) due to dynamic HTML creation involving user-influenced elements inside `innerHTML` templates.
**Learning:** Creating elements via template strings with `innerHTML` makes preventing XSS difficult when user data (e.g. filenames, text) is passed into interpolations.
**Prevention:** Create elements programmatically or use static template strings via `innerHTML`, and then query the resulting elements to assign user values securely using `textContent` or `alt` instead.
