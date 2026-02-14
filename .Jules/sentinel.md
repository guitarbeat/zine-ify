## 2024-05-23 - [Unsafe innerHTML Usage in UI Components]
**Vulnerability:** The `Toast` class was constructing HTML strings with user input and assigning them to `innerHTML`.
**Learning:** In vanilla JS projects without a framework (like React/Vue) handling escaping, developers often default to template literals and `innerHTML`, creating XSS risks.
**Prevention:** Use `document.createElement` and `textContent` for dynamic content, or a safe DOM building helper.
