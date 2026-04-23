## 2026-04-14 - Grid DoS Prevention
**Vulnerability:** Client-side Denial of Service (DoS) via unbounded DOM node generation from extreme grid dimensions.
**Learning:** User inputs that dictate the number of DOM elements created in a loop must be strictly clamped before processing to prevent browser freezes or crashes.
**Prevention:** Always enforce hard maximum limits on layout configuration inputs (e.g., max 10x10 grid) at the input handling layer.

## 2026-04-19 - Prevent Error Data Exposure
**Vulnerability:** Error Data Exposure through client-side console logging (stack traces, internal variables).
**Learning:** Raw Error objects passed to console.error() expose deep application stack traces to users and potential attackers, revealing application internals.
**Prevention:** Only log error.message or a safe generic string, rather than the raw Error object in production-facing client code.

## 2026-04-23 - Avoid .innerHTML for dynamic content
**Vulnerability:** Potential Cross-Site Scripting (XSS) via .innerHTML with dynamic content.
**Learning:** Using .innerHTML with dynamic data, even if currently sourced locally, is a risky practice that can lead to XSS if the data source becomes untrusted or compromised.
**Prevention:** Always use safe DOM manipulation methods like document.createElement, textContent, and setAttribute to handle dynamic content.
