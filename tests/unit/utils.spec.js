import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { test, expect } from '@playwright/test';
import { clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger, resizeAndFillArray, sanitizeHTML } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles
} from '../../src/utils/fileValidation.js';

test.describe('Utils', () => {
  test.beforeAll(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;

    const purify = DOMPurify(global.window);
    DOMPurify.sanitize = purify.sanitize;
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
    expect(classifyFileKind({ type: 'application/pdf', name: 'test.pdf' })).toBe('pdf');
    expect(classifyFileKind({ type: 'image/png', name: 'test.png' })).toBe('image');
    expect(classifyFileKind({ type: 'image/jpeg', name: 'test.jpg' })).toBe('image');
    expect(classifyFileKind({ type: 'text/plain', name: 'test.txt' })).toBeNull();
  });

  test('getFileTypeLabel', () => {
    expect(getFileTypeLabel('pdf')).toBe('PDF');
    expect(getFileTypeLabel('image')).toBe('Image');
    expect(getFileTypeLabel('unknown')).toBe('File');
  });

  test('validateUploadFile', () => {
    expect(validateUploadFile({ type: 'application/pdf', name: 'doc.pdf', size: 1024 })).toEqual({
      valid: true,
      errors: [],
      kind: 'pdf'
    });

    expect(validateUploadFile({ type: 'image/png', name: 'photo.png', size: 2048 })).toEqual({
      valid: true,
      errors: [],
      kind: 'image'
    });

    const invalid = validateUploadFile({ type: 'text/plain', name: 'doc.txt', size: 12 });
    expect(invalid.valid).toBe(false);
    expect(invalid.kind).toBeNull();
    expect(invalid.errors).toContain('Please select a PDF or image file.');
  });

  test('partitionSupportedFiles', () => {
    // Empty array
    expect(partitionSupportedFiles([])).toEqual({
      acceptedFiles: [],
      rejectedFiles: []
    });

    // Only accepted files
    const accepted = [{ type: 'application/pdf', name: 'a.pdf' }, { type: 'image/png', name: 'b.png' }];
    expect(partitionSupportedFiles(accepted)).toEqual({
      acceptedFiles: accepted,
      rejectedFiles: []
    });

    // Only rejected files
    const rejected = [{ type: 'text/plain', name: 'c.txt' }, { type: 'audio/mp3', name: 'd.mp3' }];
    expect(partitionSupportedFiles(rejected)).toEqual({
      acceptedFiles: [],
      rejectedFiles: rejected
    });

    // Mixed array
    const mixed = [{ type: 'application/pdf', name: 'e.pdf' }, { type: 'text/plain', name: 'f.txt' }, { type: 'image/jpeg', name: 'g.jpg' }];
    expect(partitionSupportedFiles(mixed)).toEqual({
      acceptedFiles: [mixed[0], mixed[2]],
      rejectedFiles: [mixed[1]]
    });

    // Array with edge cases (nulls, missing types)
    const edgeCases = [null, {}, { type: null }];
    expect(partitionSupportedFiles(edgeCases)).toEqual({
      acceptedFiles: [],
      rejectedFiles: edgeCases
    });
  });


  test('sanitizeHTML', () => {
    // Non-string or empty input
    let result = sanitizeHTML(null);
    expect(result.nodeType).toBe(11); // DocumentFragment
    expect(result.childNodes.length).toBe(0);

    result = sanitizeHTML('');
    expect(result.nodeType).toBe(11);
    expect(result.childNodes.length).toBe(0);

    result = sanitizeHTML(123);
    expect(result.nodeType).toBe(11);
    expect(result.childNodes.length).toBe(0);

    // Sanitizes HTML and returns a DocumentFragment with allowed tags
    const input = '<b>Bold</b> and <em>italic</em> with <script>alert(1)</script>';
    result = sanitizeHTML(input);
    expect(result.nodeType).toBe(11);
    const div = document.createElement('div');
    div.appendChild(result);
    expect(div.innerHTML).toBe('<b>Bold</b> and <em>italic</em> with ');

    // Removes disallowed tags but keeps text content
    const input2 = '<div>Div content</div><span>Span content</span>';
    result = sanitizeHTML(input2);
    const div2 = document.createElement('div');
    div2.appendChild(result);
    expect(div2.innerHTML).toBe('Div content<span>Span content</span>');

    // Handles complex nested allowed tags
    const input3 = '<b><strong><i><em><u><br><code><span>text</span></code></u></em></i></strong></b>';
    result = sanitizeHTML(input3);
    const div3 = document.createElement('div');
    div3.appendChild(result);
    expect(div3.innerHTML).toBe('<b><strong><i><em><u><br><code><span>text</span></code></u></em></i></strong></b>');
  });

  test('resizeAndFillArray', () => {
    // Growing: fills remainder with null by default
    expect(resizeAndFillArray([1, 2], 4)).toEqual([1, 2, null, null]);

    // Shrinking: truncates to requested length
    expect(resizeAndFillArray([1, 2, 3], 2)).toEqual([1, 2]);

    // Same length: returns copy of same values
    expect(resizeAndFillArray([1, 2, 3], 3)).toEqual([1, 2, 3]);

    // Custom fill value
    expect(resizeAndFillArray([1], 3, 0)).toEqual([1, 0, 0]);

    // Empty input
    expect(resizeAndFillArray([], 3)).toEqual([null, null, null]);

    // Negative requiredLength: treated as 0, returns empty array
    expect(resizeAndFillArray([1, 2], -1)).toEqual([]);
    expect(resizeAndFillArray([1, 2], 0)).toEqual([]);
  });
});
