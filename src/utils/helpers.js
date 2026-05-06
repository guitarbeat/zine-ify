// Utility functions for the PDF Zine Maker

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

export function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function parseBoundedInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min } = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampNumber(parsed, min, max);
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
 * Sanitize a limited subset of inline HTML and return it as a fragment.
 * @param {string} html - Potentially unsafe HTML string
 * @returns {DocumentFragment} Sanitized fragment safe to append into the DOM
 */
export function sanitizeHTML(html) {
  const fragment = document.createDocumentFragment();

  if (typeof html !== 'string' || html.length === 0) {
    return fragment;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'CODE', 'SPAN']);

  const sanitizeNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createTextNode('');
    }

    if (!allowedTags.has(node.tagName)) {
      return document.createTextNode(node.textContent || '');
    }

    const cleanElement = document.createElement(node.tagName.toLowerCase());
    Array.from(node.childNodes).forEach((child) => {
      cleanElement.appendChild(sanitizeNode(child));
    });

    return cleanElement;
  };

  Array.from(doc.body.childNodes).forEach((child) => {
    fragment.appendChild(sanitizeNode(child));
  });

  return fragment;
}
