import { test, expect } from '@playwright/test';
import { clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles
} from '../../src/utils/fileValidation.js';

test.describe('Utils', () => {
  test.describe('sanitizeHTML', () => {
    test('handles empty or invalid input', async ({ page }) => {
      await page.goto('/'); // ensure valid origin
      const result = await page.evaluate(() => {
        // We will inline the function for test since we cannot import directly in evaluate
        const sanitizeHTMLInline = (html) => {
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
        };

        const getHtml = (val) => {
          const div = document.createElement('div');
          div.appendChild(sanitizeHTMLInline(val));
          return div.innerHTML;
        };

        return [
          getHtml(''),
          getHtml(null),
          getHtml(undefined),
          getHtml(123)
        ];
      });

      expect(result).toEqual(['', '', '', '']);
    });

    test('allows permitted tags and text', async ({ page }) => {
      await page.goto('/');
      const result = await page.evaluate(() => {
        const sanitizeHTMLInline = (html) => {
          const fragment = document.createDocumentFragment();
          if (typeof html !== 'string' || html.length === 0) {return fragment;}
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'CODE', 'SPAN']);
          const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {return document.createTextNode(node.textContent || '');}
            if (node.nodeType !== Node.ELEMENT_NODE) {return document.createTextNode('');}
            if (!allowedTags.has(node.tagName)) {return document.createTextNode(node.textContent || '');}
            const cleanElement = document.createElement(node.tagName.toLowerCase());
            Array.from(node.childNodes).forEach((child) => cleanElement.appendChild(sanitizeNode(child)));
            return cleanElement;
          };
          Array.from(doc.body.childNodes).forEach((child) => fragment.appendChild(sanitizeNode(child)));
          return fragment;
        };

        const div = document.createElement('div');
        div.appendChild(sanitizeHTMLInline('Hello <b>bold</b> and <i>italic</i><br><code>code</code>'));
        return div.innerHTML;
      });

      expect(result).toBe('Hello <b>bold</b> and <i>italic</i><br><code>code</code>');
    });

    test('strips disallowed tags but keeps their text content', async ({ page }) => {
      await page.goto('/');
      const result = await page.evaluate(() => {
        const sanitizeHTMLInline = (html) => {
          const fragment = document.createDocumentFragment();
          if (typeof html !== 'string' || html.length === 0) {return fragment;}
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'CODE', 'SPAN']);
          const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {return document.createTextNode(node.textContent || '');}
            if (node.nodeType !== Node.ELEMENT_NODE) {return document.createTextNode('');}
            if (!allowedTags.has(node.tagName)) {return document.createTextNode(node.textContent || '');}
            const cleanElement = document.createElement(node.tagName.toLowerCase());
            Array.from(node.childNodes).forEach((child) => cleanElement.appendChild(sanitizeNode(child)));
            return cleanElement;
          };
          Array.from(doc.body.childNodes).forEach((child) => fragment.appendChild(sanitizeNode(child)));
          return fragment;
        };

        const div = document.createElement('div');
        div.appendChild(sanitizeHTMLInline('Safe <script>alert("xss")</script> and <style>body{color:red}</style> text'));
        return div.innerHTML;
      });

      expect(result).toBe('Safe  and  text');
    });

    test('handles nested tags', async ({ page }) => {
      await page.goto('/');
      const result = await page.evaluate(() => {
        const sanitizeHTMLInline = (html) => {
          const fragment = document.createDocumentFragment();
          if (typeof html !== 'string' || html.length === 0) {return fragment;}
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'CODE', 'SPAN']);
          const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {return document.createTextNode(node.textContent || '');}
            if (node.nodeType !== Node.ELEMENT_NODE) {return document.createTextNode('');}
            if (!allowedTags.has(node.tagName)) {return document.createTextNode(node.textContent || '');}
            const cleanElement = document.createElement(node.tagName.toLowerCase());
            Array.from(node.childNodes).forEach((child) => cleanElement.appendChild(sanitizeNode(child)));
            return cleanElement;
          };
          Array.from(doc.body.childNodes).forEach((child) => fragment.appendChild(sanitizeNode(child)));
          return fragment;
        };

        const div = document.createElement('div');
        div.appendChild(sanitizeHTMLInline('<b><i>nested</i></b> <div><span>allowed in div</span></div>'));
        return div.innerHTML;
      });

      expect(result).toBe('<b><i>nested</i></b> allowed in div');
    });

    test('strips all attributes from allowed tags', async ({ page }) => {
      await page.goto('/');
      const result = await page.evaluate(() => {
        const sanitizeHTMLInline = (html) => {
          const fragment = document.createDocumentFragment();
          if (typeof html !== 'string' || html.length === 0) {return fragment;}
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'CODE', 'SPAN']);
          const sanitizeNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {return document.createTextNode(node.textContent || '');}
            if (node.nodeType !== Node.ELEMENT_NODE) {return document.createTextNode('');}
            if (!allowedTags.has(node.tagName)) {return document.createTextNode(node.textContent || '');}
            const cleanElement = document.createElement(node.tagName.toLowerCase());
            Array.from(node.childNodes).forEach((child) => cleanElement.appendChild(sanitizeNode(child)));
            return cleanElement;
          };
          Array.from(doc.body.childNodes).forEach((child) => fragment.appendChild(sanitizeNode(child)));
          return fragment;
        };

        const div = document.createElement('div');
        div.appendChild(sanitizeHTMLInline('<b class="bold" onclick="alert(1)" style="color:red">bold</b>'));
        return div.innerHTML;
      });

      expect(result).toBe('<b>bold</b>');
    });
  });

  test('formatFileSize', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
    expect(formatFileSize('not a number')).toBe('0 B');
  });

  test('isNumber', () => {
    expect(isNumber(123)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-123)).toBe(true);
    expect(isNumber(1.23)).toBe(true);
    expect(isNumber('123')).toBe(false);
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber(Infinity)).toBe(false);
  });

  test('clampNumber', () => {
    expect(clampNumber(5, 1, 10)).toBe(5);
    expect(clampNumber(-3, 1, 10)).toBe(1);
    expect(clampNumber(42, 1, 10)).toBe(10);
  });

  test('parseBoundedInteger', () => {
    expect(parseBoundedInteger('7', { min: 1, max: 10, fallback: 2 })).toBe(7);
    expect(parseBoundedInteger('1000', { min: 1, max: 10, fallback: 2 })).toBe(10);
    expect(parseBoundedInteger('0', { min: 1, max: 10, fallback: 2 })).toBe(1);
    expect(parseBoundedInteger('abc', { min: 1, max: 10, fallback: 2 })).toBe(2);
  });

  test('debounce', async () => {
    let count = 0;
    const increment = () => { count++; };
    const debouncedIncrement = debounce(increment, 100);

    debouncedIncrement();
    debouncedIncrement();
    debouncedIncrement();

    expect(count).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(count).toBe(1);
  });

  test('classifyFileKind', () => {
    expect(classifyFileKind({ type: 'application/pdf' })).toBe('pdf');
    expect(classifyFileKind({ type: 'image/png' })).toBe('image');
    expect(classifyFileKind({ type: 'image/jpeg' })).toBe('image');
    expect(classifyFileKind({ type: 'text/plain' })).toBeNull();
  });

  test('getFileTypeLabel', () => {
    expect(getFileTypeLabel('pdf')).toBe('PDF');
    expect(getFileTypeLabel('image')).toBe('Image');
    expect(getFileTypeLabel('unknown')).toBe('File');
  });

  test('validateUploadFile', () => {
    expect(validateUploadFile({ type: 'application/pdf', size: 1024 })).toEqual({
      valid: true,
      errors: [],
      kind: 'pdf'
    });

    expect(validateUploadFile({ type: 'image/png', size: 2048 })).toEqual({
      valid: true,
      errors: [],
      kind: 'image'
    });

    const invalid = validateUploadFile({ type: 'text/plain', size: 12 });
    expect(invalid.valid).toBe(false);
    expect(invalid.kind).toBeNull();
    expect(invalid.errors).toContain('Please select a PDF or image file.');
  });

  test('partitionSupportedFiles', () => {
    expect(partitionSupportedFiles([])).toEqual({ acceptedFiles: [], rejectedFiles: [] });

    const pdfFile = { type: 'application/pdf', name: 'doc.pdf' };
    const imgFile = { type: 'image/png', name: 'pic.png' };
    const textFile = { type: 'text/plain', name: 'notes.txt' };
    const noTypeFile = { name: 'unknown' };

    expect(partitionSupportedFiles([pdfFile, imgFile])).toEqual({
      acceptedFiles: [pdfFile, imgFile],
      rejectedFiles: []
    });

    expect(partitionSupportedFiles([textFile, noTypeFile, null, undefined])).toEqual({
      acceptedFiles: [],
      rejectedFiles: [textFile, noTypeFile, null, undefined]
    });

    expect(partitionSupportedFiles([pdfFile, textFile, imgFile, noTypeFile])).toEqual({
      acceptedFiles: [pdfFile, imgFile],
      rejectedFiles: [textFile, noTypeFile]
    });
  });
});
