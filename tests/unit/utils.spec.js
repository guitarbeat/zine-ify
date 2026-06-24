import { test, expect } from '@playwright/test';
import { clampNumber, formatFileSize, isNumber, debounce, parseBoundedInteger } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles
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
    expect(classifyFileKind({ name: 'test.pdf', type: 'application/pdf' })).toBe('pdf');
    expect(classifyFileKind({ name: 'test.png', type: 'image/png' })).toBe('image');
    expect(classifyFileKind({ name: 'test.jpeg', type: 'image/jpeg' })).toBe('image');
    expect(classifyFileKind({ name: 'test.txt', type: 'text/plain' })).toBeNull();
  });

  test('getFileTypeLabel', () => {
    expect(getFileTypeLabel('pdf')).toBe('PDF');
    expect(getFileTypeLabel('image')).toBe('Image');
    expect(getFileTypeLabel('unknown')).toBe('File');
  });

  test('validateUploadFile', () => {
    expect(validateUploadFile({ name: 'test.pdf', type: 'application/pdf', size: 1024 })).toEqual({
      valid: true,
      errors: [],
      kind: 'pdf'
    });

    expect(validateUploadFile({ name: 'test.png', type: 'image/png', size: 2048 })).toEqual({
      valid: true,
      errors: [],
      kind: 'image'
    });

    const invalid = validateUploadFile({ name: 'test.txt', type: 'text/plain', size: 12 });
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
    const accepted = [{ name: 'test.pdf', type: 'application/pdf' }, { name: 'test.png', type: 'image/png' }];
    expect(partitionSupportedFiles(accepted)).toEqual({
      acceptedFiles: accepted,
      rejectedFiles: []
    });

    // Only rejected files
    const rejected = [{ name: 'test.txt', type: 'text/plain' }, { name: 'test.mp3', type: 'audio/mp3' }];
    expect(partitionSupportedFiles(rejected)).toEqual({
      acceptedFiles: [],
      rejectedFiles: rejected
    });

    // Mixed array
    const mixed = [{ name: '1.pdf', type: 'application/pdf' }, { name: '2.txt', type: 'text/plain' }, { name: '3.jpeg', type: 'image/jpeg' }];
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
