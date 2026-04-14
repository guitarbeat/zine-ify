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

## 2024-05-24 - [Unsafe Eval in Content Security Policy]
**Vulnerability:** The application's Content Security Policy (CSP) previously included `'unsafe-eval'` in the `script-src` directive, leaving it vulnerable to certain types of Cross-Site Scripting (XSS) attacks through the execution of string-based code (e.g., `eval()`, `new Function()`, `setTimeout()`).
**Learning:** Even with secure programming practices, defense-in-depth requires strict CSP rules. It's often mistakenly assumed that external libraries like PDF.js necessitate `'unsafe-eval'`, but passing `isEvalSupported: false` alongside `enableScripting: false` allows strict CSP compliance without breaking functionality.
**Prevention:** Remove `'unsafe-eval'` from `script-src` in the CSP. Always verify if external dependencies can be configured to avoid needing `eval()` before widening the policy.

## 2025-02-14 - [Client-Side DoS via Unbounded PDF Pages]
**Vulnerability:** A client-side Denial of Service (DoS) vulnerability existed because there was no upper limit enforced on the number of pages a processed PDF could contain. While grid inputs were clamped, a massive PDF (e.g., 1000+ pages) would still be entirely parsed and looped over in `processAdditionalPDF`, causing excessive memory allocation, canvas rendering, and browser crashing.
**Learning:** When dealing with files supplied by the user, trusting metadata fields that determine loop iterations or array allocations (like `numPages` in PDF.js) is unsafe without hard-coded sanity checks. Any process scaling with user input size must have a strict upper bound.
**Prevention:** Always enforce strict maximum limits on file size AND intrinsic data dimensions (like page counts, row limits, or element counts) immediately upon reading the file metadata, aborting processing early if limits are exceeded.

## 2025-02-14 - [CSP Hardening with object-src and base-uri]
**Vulnerability:** The Content Security Policy (CSP) lacked `object-src 'none'` and `base-uri 'none'` directives, potentially exposing the application to exploits involving malicious plugins (e.g., Flash or Java) or `<base>` tag injection that could hijack relative URLs.
**Learning:** A robust defense-in-depth strategy requires explicitly blocking obsolete or risky browser features via CSP. Even if an application doesn't use `<object>`, `<embed>`, or `<applet>`, omitting `object-src 'none'` leaves a gap that attackers could exploit. Similarly, omitting `base-uri 'none'` allows attackers who can inject HTML (even if scripts are blocked) to manipulate the base URL and redirect relative links or resource loads to malicious domains.
**Prevention:** Always include `object-src 'none';` and `base-uri 'none';` in the Content Security Policy for all web applications, unless there is a specific, explicitly documented business requirement for plugins or dynamic base URIs.
