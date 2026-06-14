🧪 [Testing Improvement] Add comprehensive tests for PDFProcessor loadPDF

🎯 **What:** The testing gap addressed
The `loadPDF` method in `src/services/PDFProcessor.js` lacked testing coverage, despite handling asynchronous initialization and complex edge cases like file signature validation, corrupt PDFs, and pagination limits.

📊 **Coverage:** What scenarios are now tested
- `loadPDF` throwing errors for general file validation failures.
- `loadPDF` throwing errors when PDF magic byte signature validation fails.
- `loadPDF` properly cleaning up previous resources before initializing a new document.
- `loadPDF` successfully loading a PDF and extracting correct metadata, while emitting progress events.
- `loadPDF` properly handling corner cases: throwing an error if the PDF has 0 pages (empty/corrupted), and if it exceeds the maximum pagination limit (>128).

✨ **Result:** The improvement in test coverage
Unit test coverage for `PDFProcessor` is now comprehensive and robust, allowing for confident future refactoring and ensuring the asynchronous setup logic works deterministically across different edge cases.
