## 2024-03-18 - Client-Side DoS via HTML Attribute Bypass
**Vulnerability:** Client-Side Denial of Service (DoS) due to unvalidated numeric input dictating massive loop iterations and DOM node creation.
**Learning:** HTML `min` and `max` attributes can easily be bypassed by attackers modifying the value directly in the browser. Using these values without serverside/javascript clamping allowed the creation of massive amounts of DOM elements, freezing or crashing the application.
**Prevention:** Always validate and strictly clamp numeric user inputs in JavaScript (e.g., using `Math.min()` and `Math.max()`) before using them for resource allocation or loop bounds, and sync the clamped values back to the UI.
