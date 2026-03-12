## 2024-05-24 - [XSS in Dynamic HTML Generation]
**Vulnerability:** DOM-based XSS in the `Toast` component due to direct interpolation of user input into `innerHTML`.
**Learning:** Even internal utility components like `Toast` can be vectors for XSS if they treat input as HTML by default, especially when developers might unknowingly pass unsanitized strings (like filenames).
**Prevention:** Use `textContent` for dynamic content or safer alternatives like `document.createElement` to ensure all user input is treated as text, not HTML. Only use `innerHTML` for trusted, static content.

## 2024-05-24 - [Polyglot and PDF JavaScript Execution]
**Vulnerability:** The application was vulnerable to polyglot file attacks because the PDF file signature validation loosely checked for `%PDF-` anywhere within the first 1024 bytes (using `.includes()`). Additionally, it allowed execution of embedded JavaScript and evaluation of code within parsed PDFs.
**Learning:** Loose file signature checks can allow malicious payloads (e.g., hidden HTML/JS scripts) to bypass validation as long as the magic bytes exist somewhere within the buffer limit. Furthermore, failing to explicitly disable scripting in parsing libraries like PDF.js leaves the application open to arbitrary code execution from maliciously crafted documents.
**Prevention:** Enforce strict file signature matching by verifying magic bytes at the exact starting offset (`.startsWith('%PDF-')` on the first 5 bytes). When using PDF.js, explicitly pass `enableScripting: false` and `isEvalSupported: false` in `pdfjsLib.getDocument` options to ensure static, safe rendering.

## 2024-05-24 - [DOM XSS via Uploaded Filenames]
**Vulnerability:** A DOM-based XSS existed where user-uploaded file names were injected directly into the HTML using `innerHTML` in the `updateUploadedFilesList` component. Maliciously crafted filenames could execute arbitrary JavaScript.
**Learning:** Data from file objects (like `file.name`) should always be treated as untrusted user input. Using template literals combined with `innerHTML` to display file metadata is a common source of injection vulnerabilities.
**Prevention:** Construct UI elements dynamically using `document.createElement()` and bind untrusted input exclusively to safe properties like `textContent` rather than interpolating strings to be parsed as HTML. Bind handlers via `addEventListener` instead of inline string attributes.

## 2024-05-24 - [Client-Side DoS via Unbounded Grid Generation]
**Vulnerability:** A Denial of Service (DoS) vulnerability existed in `handleGridChange` where unbounded user input for grid rows and columns was directly multiplied to determine DOM node creation, which could freeze the user's browser if given exceptionally large values (e.g., bypassing HTML limits via DOM injection).
**Learning:** Client-side iteration derived from user input without strict bounds checks can lead to resource exhaustion and thread blocking. HTML attributes like `min` and `max` on inputs are suggestions and easily bypassed.
**Prevention:** Always clamp numeric user inputs that determine loop iterations or resource allocations directly in JavaScript logic using `Math.max()` and `Math.min()` to establish hard safety boundaries.
