import { formatFileSize } from './helpers.js';

export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
export const SUPPORTED_UPLOAD_ACCEPT = 'application/pdf,image/*';
export const UNSUPPORTED_UPLOAD_TITLE = 'Unsupported File';
export const SUPPORTED_UPLOAD_MESSAGE = 'Please select a PDF or image file.';
export const MIXED_UPLOAD_WARNING = 'Some files were skipped. Upload PDFs or image files only.';

export function classifyFileKind(file) {
  if (!file) {
    return null;
  }

  if (file.type === 'application/pdf') {
    return 'pdf';
  }

  if (typeof file.type === 'string' && file.type.startsWith('image/')) {
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
