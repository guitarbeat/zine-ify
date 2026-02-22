## 2024-05-23 - Memory Leak in Blob URL Array Reassignment
**Learning:** In a Single Page Application, simply reassigning an array (e.g., `this.allPageImages = new Array(...)`) that holds Blob URLs does NOT release the memory associated with those URLs. The garbage collector reclaims the array, but the browser keeps the Blob URLs alive until `URL.revokeObjectURL` is explicitly called or the document is unloaded.
**Action:** Always implement a cleanup method (e.g., `cleanupOldImages`) that iterates through the old array and calls `URL.revokeObjectURL` BEFORE overwriting the array reference.
