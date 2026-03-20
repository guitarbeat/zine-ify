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

## 2024-05-24 - [Client-Side DoS via Massive DOM Generation]
**Vulnerability:** Client-side Denial of Service (DoS) due to unbounded grid layout dimensions. The `handleGridChange` function generated a custom grid using unbounded `rows` and `cols` from user input.
**Learning:** Numeric user inputs dictating loop iterations or massive resource allocation (such as `rows` and `cols` for grid generation) must be strictly clamped in JavaScript, as HTML `min` and `max` attributes can be easily bypassed by modifying the DOM or using JS eval.
**Prevention:** Strictly clamp resource-determining user inputs (e.g., between 1 and 10) inside JavaScript event handlers before utilizing them in heavy DOM generation or loop iterations. Sync the clamped values back to the UI.

## 2024-05-24 - [Missing Content Security Policy (CSP)]
**Vulnerability:** The application previously lacked a Content Security Policy (CSP), leaving it fully exposed to Cross-Site Scripting (XSS), data injection, and unauthorized resource loading.
**Learning:** Even if client-side validation is robust, defense-in-depth necessitates a CSP to mitigate risks when user-supplied content (like filenames or parsed PDF data) is processed. A well-configured CSP ensures that only trusted resources are executed or loaded, providing a critical safety net against XSS.
**Prevention:** Always define a strict CSP via the `Content-Security-Policy` HTTP header or a `<meta>` tag in `index.html`. For modern web apps relying on local blob URLs (e.g. for canvas elements or Web Workers), carefully allow `blob:` and `data:` in `worker-src` and `img-src` respectively, without resorting to global wildcards.
