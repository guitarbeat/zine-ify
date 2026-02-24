// Modern utility functions for the PDF Zine Maker

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if a value is a valid number
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a number
 */
export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (!isNumber(bytes)) { return '0 B'; }
  if (bytes === 0) { return '0 B'; }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a promise that resolves after a delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise} Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize HTML string to prevent XSS while allowing safe formatting
 * @param {string} str - HTML string to sanitize
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  const allowedTags = ['b', 'i', 'strong', 'em', 'u', 'br', 'p', 'span'];

  const sanitizeNode = (node) => {
    if (node.nodeType === 3) return; // Text node is safe
    if (node.nodeType !== 1) {
      node.remove();
      return;
    }

    const tagName = node.tagName.toLowerCase();
    if (!allowedTags.includes(tagName)) {
      // Replace with text content
      const text = document.createTextNode(node.textContent);
      node.replaceWith(text);
      return;
    }

    // Remove all attributes
    while (node.attributes.length > 0) {
      node.removeAttribute(node.attributes[0].name);
    }

    // Recursively sanitize children
    Array.from(node.childNodes).forEach(sanitizeNode);
  };

  Array.from(doc.body.childNodes).forEach(sanitizeNode);
  return doc.body.innerHTML;
}
