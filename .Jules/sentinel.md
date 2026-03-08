## 2024-05-24 - [XSS in Dynamic HTML Generation]
**Vulnerability:** DOM-based XSS in the `Toast` component due to direct interpolation of user input into `innerHTML`.
**Learning:** Even internal utility components like `Toast` can be vectors for XSS if they treat input as HTML by default, especially when developers might unknowingly pass unsanitized strings (like filenames).
**Prevention:** Use `textContent` for dynamic content or safer alternatives like `document.createElement` to ensure all user input is treated as text, not HTML. Only use `innerHTML` for trusted, static content.

## 2024-05-24 - [Polyglot and PDF JavaScript Execution]
**Vulnerability:** The application was vulnerable to polyglot file attacks because the PDF file signature validation loosely checked for `%PDF-` anywhere within the first 1024 bytes (using `.includes()`). Additionally, it allowed execution of embedded JavaScript and evaluation of code within parsed PDFs.
**Learning:** Loose file signature checks can allow malicious payloads (e.g., hidden HTML/JS scripts) to bypass validation as long as the magic bytes exist somewhere within the buffer limit. Furthermore, failing to explicitly disable scripting in parsing libraries like PDF.js leaves the application open to arbitrary code execution from maliciously crafted documents.
**Prevention:** Enforce strict file signature matching by verifying magic bytes at the exact starting offset (`.startsWith('%PDF-')` on the first 5 bytes). When using PDF.js, explicitly pass `enableScripting: false` and `isEvalSupported: false` in `pdfjsLib.getDocument` options to ensure static, safe rendering.

## 2024-05-25 - [XSS in Uploaded Files List]
**Vulnerability:** DOM-based XSS in the `UIManager.updateUploadedFilesList` component (in `src/js/zine-ui.js`) due to direct string concatenation of user-controlled filenames into the `innerHTML` property of the `uploadedFilesList` container.
**Learning:** Any UI area that renders user-provided data, such as a list of uploaded files, is a potential vector for DOM XSS. Reusing existing components or duplicating patterns (like the toast notifications issue) requires vigilance.
**Prevention:** Avoid `innerHTML` entirely for dynamic lists. Use `document.createElement` to construct the DOM tree manually and inject user data using the `textContent` property, which escapes HTML entities by default. Bind event listeners programmatically with `addEventListener` instead of inline HTML attributes (`onclick`).
