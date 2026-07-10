## 2026-05-13 - [Fixed XSS in UIManager `updateUploadedFilesList`]
**Learning:** Using `innerHTML` with unsanitized file names like `file.name` allows a cross-site scripting (XSS) payload to execute if the filename contains executable scripts (e.g. `<img src=x onerror=alert(1)>`). Programmatic DOM generation with `.textContent` avoids XSS vulnerabilities by assigning text safely as node content.
**Action:** When working on file upload lists or dynamically appending user-supplied data in UIs, always use `textContent` over `innerHTML` to ensure untrusted input remains treated strictly as data.

## 2026-07-09 - [Fixed XSS in FormValidationService `createValidationDemo`]
**Learning:** Using `insertAdjacentHTML` with unvalidated or raw HTML containing potentially user-influenced inputs can expose cross-site scripting (XSS) vulnerabilities.
**Action:** Always sanitize raw HTML using a robust sanitizer like `DOMPurify` before injecting it into the DOM with methods like `insertAdjacentHTML`.
