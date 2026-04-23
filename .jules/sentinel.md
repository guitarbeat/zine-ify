## 2026-04-14 - Grid DoS Prevention
**Vulnerability:** Client-side Denial of Service (DoS) via unbounded DOM node generation from extreme grid dimensions.
**Learning:** User inputs that dictate the number of DOM elements created in a loop must be strictly clamped before processing to prevent browser freezes or crashes.
**Prevention:** Always enforce hard maximum limits on layout configuration inputs (e.g., max 10x10 grid) at the input handling layer.

## 2026-04-17 - Prevent Error Data Exposure in Client Logs
**Vulnerability:** Raw error objects were being logged directly to the browser console (`console.error(error)`), which can leak sensitive application metadata, memory structures, and stack traces to users.
**Learning:** Even though client-side errors aren't directly exposing server secrets, leaking the full error object can provide attackers with deep context about the internal workings, dependencies, and environment of the application.
**Prevention:** Sanitize all production-facing console logs by extracting only safe, necessary strings (like `error.message`) or using a generic fallback message, rather than passing the raw `Error` object.
