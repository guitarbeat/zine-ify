import { test, expect } from '@playwright/test';
import { clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger, sanitizeHTML } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  MAX_UPLOAD_FILE_SIZE
} from '../../src/utils/fileValidation.js';

test.describe('Utils', () => {
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

  test('validateUploadFile: valid PDF', () => {
    expect(validateUploadFile({ type: 'application/pdf', size: 1024 })).toEqual({
      valid: true,
      errors: [],
      kind: 'pdf'
    });
  });

  test('validateUploadFile: valid image', () => {
    expect(validateUploadFile({ type: 'image/png', size: 2048 })).toEqual({
      valid: true,
      errors: [],
      kind: 'image'
    });
  });

  test('validateUploadFile: unsupported file type', () => {
    const invalid = validateUploadFile({ type: 'text/plain', size: 12 });
    expect(invalid.valid).toBe(false);
    expect(invalid.kind).toBeNull();
    expect(invalid.errors).toContain('Please select a PDF or image file.');
  });

  test('validateUploadFile: null file', () => {
    const result = validateUploadFile(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No file selected');
  });

  test('validateUploadFile: empty file', () => {
    const result = validateUploadFile({ type: 'application/pdf', size: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File appears to be empty');
  });

  test('validateUploadFile: oversized file', () => {
    const result = validateUploadFile({ type: 'application/pdf', size: MAX_UPLOAD_FILE_SIZE + 1 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('File too large'))).toBe(true);
  });
});

test.describe('sanitizeHTML', () => {
  test.beforeEach(async () => {
    // We mock document and DOMParser for Node context using jsdom
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM();
    global.document = dom.window.document;
    global.Node = dom.window.Node;
    global.DOMParser = dom.window.DOMParser;
  });

  test('sanitizeHTML: valid simple tags', async () => {
    const frag = sanitizeHTML('<b>hello</b>');
    const div = document.createElement('div');
    div.appendChild(frag);
    expect(div.innerHTML).toBe('<b>hello</b>');
  });

  test('sanitizeHTML: script tag stripped', async () => {
    const frag = sanitizeHTML('<script>alert(1)</script>world');
    const div = document.createElement('div');
    div.appendChild(frag);
    expect(div.innerHTML).toBe('world');
  });

  test('sanitizeHTML: attributes removed', async () => {
    const frag = sanitizeHTML('<b onclick="alert()">bold</b>');
    const div = document.createElement('div');
    div.appendChild(frag);
    expect(div.innerHTML).toBe('<b>bold</b>');
  });

  test('sanitizeHTML: nested tags and invalid mixed', async () => {
    const frag = sanitizeHTML('<span>text <img src="x" onerror="alert(1)"></span>');
    const div = document.createElement('div');
    div.appendChild(frag);
    expect(div.innerHTML).toBe('<span>text </span>');
  });

  test('sanitizeHTML: empty and null inputs', async () => {
    const fragEmpty = sanitizeHTML('');
    const fragNull = sanitizeHTML(null);
    expect(fragEmpty.childNodes.length).toBe(0);
    expect(fragNull.childNodes.length).toBe(0);
  });
});
