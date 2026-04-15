## 2026-04-15 - Prevent Error Data Exposure by sanitizing console.error
**Vulnerability:** The application was logging raw `Error` objects directly to the browser console (`console.error(error)`) during initialization failures.
**Learning:** Raw `Error` objects can contain sensitive stack traces, file paths, and internal application metadata that could be exposed to third-party scripts, browser extensions, or malicious users inspecting the console, leading to Information Disclosure (Error Data Exposure).
**Prevention:** Always sanitize errors before logging them to the client-side console in production environments, extracting and logging only safe, user-facing properties like `error.message` or using a generic fallback string.
