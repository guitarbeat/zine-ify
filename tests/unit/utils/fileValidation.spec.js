import { test, expect } from '@playwright/test';
import {
  classifyFileKind,
  getFileTypeLabel,
  validateUploadFile,
  partitionSupportedFiles,
  MAX_UPLOAD_FILE_SIZE,
  MAX_FILE_NAME_LENGTH,
  SUPPORTED_UPLOAD_MESSAGE
} from '../../../src/utils/fileValidation.js';

test.describe('fileValidation Utility', () => {
  test.describe('classifyFileKind', () => {
    test('returns null for missing file or invalid file object', () => {
      expect(classifyFileKind(null)).toBeNull();
      expect(classifyFileKind(undefined)).toBeNull();
      expect(classifyFileKind({})).toBeNull();
      expect(classifyFileKind({ name: 123 })).toBeNull();
    });

    test('returns null when filename has no extension or is a hidden file without extension', () => {
      expect(classifyFileKind({ name: 'filename' })).toBeNull();
      expect(classifyFileKind({ name: '.gitignore' })).toBeNull();
    });

    test('classifies valid PDF files', () => {
      const file = { name: 'document.pdf', type: 'application/pdf' };
      expect(classifyFileKind(file)).toBe('pdf');
    });

    test('returns null for PDF extension with wrong MIME type or vice versa', () => {
      expect(classifyFileKind({ name: 'document.pdf', type: 'text/plain' })).toBeNull();
      expect(classifyFileKind({ name: 'document.txt', type: 'application/pdf' })).toBeNull();
    });

    test('classifies valid image files with allowed extensions', () => {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
      for (const ext of imageExtensions) {
        const file = { name: `picture.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
        expect(classifyFileKind(file)).toBe('image');
      }
    });

    test('case-insensitively classifies extensions', () => {
      const file = { name: 'PICTURE.PNG', type: 'image/png' };
      expect(classifyFileKind(file)).toBe('image');
    });

    test('returns null for image with unsupported extension or missing/non-string type', () => {
      expect(classifyFileKind({ name: 'image.tiff', type: 'image/tiff' })).toBeNull();
      expect(classifyFileKind({ name: 'image.png', type: null })).toBeNull();
      expect(classifyFileKind({ name: 'image.png', type: 123 })).toBeNull();
    });
  });

  test.describe('getFileTypeLabel', () => {
    test('returns correct label for known kinds and defaults to File', () => {
      expect(getFileTypeLabel('pdf')).toBe('PDF');
      expect(getFileTypeLabel('image')).toBe('Image');
      expect(getFileTypeLabel('unknown')).toBe('File');
      expect(getFileTypeLabel(null)).toBe('File');
    });
  });

  test.describe('validateUploadFile', () => {
    test('returns invalid when file is null or undefined', () => {
      const result = validateUploadFile(null);
      expect(result.valid).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.errors).toContain('No file selected');
    });

    test('validates a correct PDF file', () => {
      const file = {
        name: 'sample.pdf',
        type: 'application/pdf',
        size: 1024 * 1024
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(true);
      expect(result.kind).toBe('pdf');
      expect(result.errors).toEqual([]);
    });

    test('detects unsupported file kind', () => {
      const file = {
        name: 'file.exe',
        type: 'application/x-msdownload',
        size: 1024
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.kind).toBeNull();
      expect(result.errors).toContain(SUPPORTED_UPLOAD_MESSAGE);
    });

    test('detects file that exceeds maximum size', () => {
      const file = {
        name: 'large.pdf',
        type: 'application/pdf',
        size: MAX_UPLOAD_FILE_SIZE + 1
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('File too large'))).toBe(true);
    });

    test('detects empty file', () => {
      const file = {
        name: 'empty.pdf',
        type: 'application/pdf',
        size: 0
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File appears to be empty');
    });

    test('detects filename exceeding maximum character length', () => {
      const longName = 'a'.repeat(MAX_FILE_NAME_LENGTH + 1) + '.pdf';
      const file = {
        name: longName,
        type: 'application/pdf',
        size: 1024
      };
      const result = validateUploadFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors.some((err) => err.includes('File name is too long'))).toBe(true);
    });
  });

  test.describe('partitionSupportedFiles', () => {
    test('returns empty arrays when input is not an array', () => {
      expect(partitionSupportedFiles(null)).toEqual({ acceptedFiles: [], rejectedFiles: [] });
      expect(partitionSupportedFiles(123)).toEqual({ acceptedFiles: [], rejectedFiles: [] });
    });

    test('correctly partitions accepted and rejected files', () => {
      const pdf = { name: 'doc.pdf', type: 'application/pdf' };
      const img = { name: 'photo.jpg', type: 'image/jpeg' };
      const txt = { name: 'notes.txt', type: 'text/plain' };

      const { acceptedFiles, rejectedFiles } = partitionSupportedFiles([pdf, img, txt]);

      expect(acceptedFiles).toEqual([pdf, img]);
      expect(rejectedFiles).toEqual([txt]);
    });
  });
});
