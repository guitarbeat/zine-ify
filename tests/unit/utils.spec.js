import { test, expect } from '@playwright/test';
import { clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger, sanitizeHTML } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles
} from '../../src/utils/fileValidation.js';
import { JSDOM } from 'jsdom';

test.describe('Utils', () => {
  test.beforeAll(() => {
    // Setup global window and document for DOMPurify
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.DocumentFragment = dom.window.DocumentFragment;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.DocumentFragment;
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

  test('sanitizeHTML', () => {
    // 1. Valid inputs with allowed tags
    const doc1 = sanitizeHTML('<b>bold</b> and <i>italic</i>');
    expect(doc1.childNodes.length).toBeGreaterThan(0);
    expect(doc1.textContent).toBe('bold and italic');
    expect(doc1.querySelector('b')).not.toBeNull();
    expect(doc1.querySelector('i')).not.toBeNull();

    // 2. Stripping disallowed tags
    const doc2 = sanitizeHTML('<script>alert("xss")</script><p>text</p><span>span</span>');
    expect(doc2.querySelector('script')).toBeNull();
    expect(doc2.textContent).toBe('textspan');
    expect(doc2.querySelector('span')).not.toBeNull();

    // 3. Handling invalid inputs
    const doc3 = sanitizeHTML(null);
    expect(doc3).toBeTruthy();
    expect(doc3.nodeType).toBe(11); // DocumentFragment
    expect(doc3.childNodes.length).toBe(0);

    const doc4 = sanitizeHTML('');
    expect(doc4.nodeType).toBe(11);
    expect(doc4.childNodes.length).toBe(0);

    const doc5 = sanitizeHTML(123);
    expect(doc5.nodeType).toBe(11);
    expect(doc5.childNodes.length).toBe(0);
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
    expect(validateUploadFile({ type: 'application/pdf', size: 1024, name: 'test.pdf' })).toEqual({
      valid: true,
      errors: [],
      kind: 'pdf'
    });

    expect(validateUploadFile({ type: 'image/png', size: 2048, name: 'test.png' })).toEqual({
      valid: true,
      errors: [],
      kind: 'image'
    });

    const invalid = validateUploadFile({ type: 'text/plain', size: 12, name: 'test.txt' });
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
});
