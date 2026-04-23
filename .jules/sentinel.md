## 2026-04-16 - Prevent Error Data Exposure

**Vulnerability:** The application was logging raw Error objects via `console.error` directly to the client browser console.
**Learning:** This could expose sensitive internal metadata or stack traces to any user observing the console logs, leading to potential data leakage.
**Prevention:** Always sanitize console logs (`console.error`, `console.warn`) in production-facing client-side code by logging only a generic message or `error.message`.
