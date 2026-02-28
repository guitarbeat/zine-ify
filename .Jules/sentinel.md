## 2024-05-24 - [XSS in Dynamic HTML Generation]
**Vulnerability:** DOM-based XSS in the `Toast` component due to direct interpolation of user input into `innerHTML`.
**Learning:** Even internal utility components like `Toast` can be vectors for XSS if they treat input as HTML by default, especially when developers might unknowingly pass unsanitized strings (like filenames).
**Prevention:** Use `textContent` for dynamic content or safer alternatives like `document.createElement` to ensure all user input is treated as text, not HTML. Only use `innerHTML` for trusted, static content.

## 2024-05-24 - [PDF.js JavaScript Execution Prevention]
**Vulnerability:** Malicious PDFs can contain embedded JavaScript that could be executed by the PDF.js renderer if scripting is enabled.
**Learning:** By default, PDF.js might evaluate or execute scripts embedded in PDFs, which presents a significant security risk when handling user-uploaded files.
**Prevention:** Always explicitly pass `enableScripting: false` and `isEvalSupported: false` to `pdfjsLib.getDocument` when rendering untrusted PDFs to strictly disable JavaScript execution.
