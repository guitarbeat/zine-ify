## 2026-05-15 - E2E Testing for Print Error Handling

**Learning:** E2E testing for functions that show error toasts based on internal mock failures requires exposing the mocked object correctly on `window.app` and successfully triggering the event via UI interactions. Also discovered `jsPDF` usage to construct dummy valid files to bypass early validation guards.

**Action:** Ensure tests that depend on specific validation states (like `getFilledPageCount() > 0`) properly seed those states before mocking the target function.
## 2026-07-14 - Unit Testing for DOM-manipulating Components with Events

**Learning:** When unit testing components that bind event listeners to a container using delegation (e.g. `container.addEventListener('change', ...)`), triggering changes that result in a full re-render (e.g. `innerHTML = ...`) will destroy references to previously queried DOM elements. Dispatching events on those stale elements will not bubble up to the container.
**Action:** Re-query the DOM element inside the test after any action that triggers a re-render before attempting to dispatch new events on it.
