## 2026-04-14 - Grid DoS Prevention
**Vulnerability:** Client-side Denial of Service (DoS) via unbounded DOM node generation from extreme grid dimensions.
**Learning:** User inputs that dictate the number of DOM elements created in a loop must be strictly clamped before processing to prevent browser freezes or crashes.
**Prevention:** Always enforce hard maximum limits on layout configuration inputs (e.g., max 10x10 grid) at the input handling layer.

## 2026-04-19 - Prevent Error Data Exposure
**Vulnerability:** Error Data Exposure through client-side console logging (stack traces, internal variables).
**Learning:** Raw Error objects passed to console.error() expose deep application stack traces to users and potential attackers, revealing application internals.
**Prevention:** Only log error.message or a safe generic string, rather than the raw Error object in production-facing client code.

## 2026-04-23 - Prevent DOM Clobbering/XSS in Sanitizer
**Vulnerability:** Safe HTML sanitization using `template.innerHTML` could potentially trigger execution of payload (e.g. `img` `onerror`) before sanitization takes place if assigned directly.
**Learning:** Assigning unsafe strings to `innerHTML`, even on detached template tags, has inherent risks. Using `DOMParser` parses the string into a safe document object model without evaluating executing elements.
**Prevention:** Use `new DOMParser().parseFromString(html, 'text/html')` for safe DOM element creation during sanitization instead of `innerHTML` assignment.

## 2026-05-12 - Prevent DOM-based XSS via innerHTML
**Vulnerability:** DOM-based XSS through assignment of interpolated strings to innerHTML in dynamic UI elements.
**Learning:** Assigning unsafe or dynamically constructed strings containing variables directly to innerHTML is a primary vector for XSS vulnerabilities.
**Prevention:** Use programmatic DOM construction (`document.createElement`, `textContent`, and safe attribute assignment) instead of `innerHTML` for UI components containing variable data.
## 2026-05-12 - [Test Dependency Added]
**Learning:** Testing DOM manipulation in Node using JSDOM is effective but introduces `jsdom` dependency.
**Action:** Monitored package updates carefully, added it cleanly without compromising build artifacts.
