import { test, expect } from '@playwright/test';
import { cn, clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger, resizeAndFillArray } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles
} from '../../src/utils/fileValidation.js';

test.describe('Utils', () => {
  test('cn', () => {
    // Strings
    expect(cn('a', 'b')).toBe('a b');

    // Tailwind conflicts
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');

    // Conditionals
    expect(cn('a', (() => false)() && 'b', 'c')).toBe('a c');
    expect(cn('a', (() => true)() && 'b', 'c')).toBe('a b c');

    // Objects
    expect(cn({ a: true, b: false, c: true })).toBe('a c');

    // Arrays
    expect(cn(['a', 'b', 'c'])).toBe('a b c');

    // Mixed
    expect(cn('a', { b: true, c: false }, ['d', 'e'], 'p-2 p-4')).toBe('a b d e p-4');
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
