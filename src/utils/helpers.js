import DOMPurify from 'dompurify';
// Utility functions for the PDF Zine Maker
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind classes with clsx
 * @param {...any} inputs - Class values to merge
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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
  if (typeof html !== 'string' || html.length === 0) {
    return document.createDocumentFragment();
  }

  // Use DOMPurify for secure HTML sanitization instead of template.innerHTML fallback
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'code', 'span'],
    RETURN_DOM_FRAGMENT: true
  });
}

/**
 * Resizes an array to a required length, preserving existing items and filling the rest.
 * @param {Array} arr - The original array
 * @param {number} requiredLength - The desired length of the new array
 * @param {*} fillValue - The value to fill the new slots with (default: null)
 * @returns {Array} A new array of the required length
 */
export function resizeAndFillArray(arr, requiredLength, fillValue = null) {
  const nextImages = new Array(Math.max(0, requiredLength)).fill(fillValue);
  for (let index = 0; index < Math.min(arr.length, nextImages.length); index++) {
    nextImages[index] = arr[index];
  }
  return nextImages;
}
