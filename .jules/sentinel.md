## 2026-04-16 - PDF.js cMaps Version Mismatch and CSP Restriction

**Vulnerability:** External Dependency Version Mismatch for cMaps. The application was missing explicit cMap configuration, and a potential hardcoded or default CDN link would have caused a version mismatch with the core `pdfjs-dist` library (5.4.624). Furthermore, the Content Security Policy (CSP) did not permit connections to `https://cdn.jsdelivr.net`, which is required for fetching external cMaps used in character mapping for certain PDF files.

**Learning:** PDF.js requires cMaps to correctly render PDFs that use non-standard font encodings. When these are fetched from a CDN, the version of the cMaps must exactly match the version of the `pdfjs-dist` library being used. Additionally, the CSP must be explicitly configured to allow the connection to the CDN provider.

**Prevention:** Always pin external assets fetched via CDN to the exact version of the corresponding local dependency. Maintain a strict but functional CSP that explicitly whitelists necessary external resources.
