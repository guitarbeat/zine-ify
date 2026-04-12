import { test, expect } from '@playwright/test';
import { formatFileSize, isNumber, debounce } from '../../src/utils/helpers.js';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile
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
});
