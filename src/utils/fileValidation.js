import { formatFileSize } from './helpers.js';

export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_FILE_NAME_LENGTH = 255;
export const SUPPORTED_UPLOAD_ACCEPT = 'application/pdf,image/*';
export const UNSUPPORTED_UPLOAD_TITLE = 'Unsupported File';
export const SUPPORTED_UPLOAD_MESSAGE = 'Please select a PDF or image file.';
export const MIXED_UPLOAD_WARNING = 'Some files were skipped. Upload PDFs or image files only.';

export function classifyFileKind(file) {
  if (!file) {
    return null;
  }

  const isPdfType = file.type === 'application/pdf';
  const isImageType = typeof file.type === 'string' && file.type.startsWith('image/');

  if (typeof file.name === 'string') {
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex > 0) {
      const extension = file.name.substring(lastDotIndex + 1).toLowerCase();
      const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];

      if (isPdfType && extension === 'pdf') {
        return 'pdf';
      }

      if (isImageType && allowedImageExtensions.includes(extension)) {
        return 'image';
      }

      return null;
    }
  }

  // Fallback for files without a name property (like Blobs or mocks in tests)
  if (isPdfType) {
    return 'pdf';
  }

  if (isImageType) {
    return 'image';
  }

  return null;
}

export function getFileTypeLabel(kind) {
  if (kind === 'pdf') {
    return 'PDF';
  }

  if (kind === 'image') {
    return 'Image';
  }

  return 'File';
}

export function validateUploadFile(file) {
  const errors = [];
  const kind = classifyFileKind(file);

  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors, kind: null };
  }

  if (!kind) {
    errors.push(SUPPORTED_UPLOAD_MESSAGE);
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    errors.push(`File too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_UPLOAD_FILE_SIZE)}`);
  }

  if (file.size === 0) {
    errors.push('File appears to be empty');
  }

  if (file.name && file.name.length > MAX_FILE_NAME_LENGTH) {
    errors.push(`File name is too long (maximum ${MAX_FILE_NAME_LENGTH} characters)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    kind
  };
}

export function partitionSupportedFiles(files) {
  const acceptedFiles = [];
  const rejectedFiles = [];

  files.forEach((file) => {
    if (classifyFileKind(file)) {
      acceptedFiles.push(file);
    } else {
      rejectedFiles.push(file);
    }
  });

  return { acceptedFiles, rejectedFiles };
}
