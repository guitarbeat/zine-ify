// Modern PDF processing class

import * as pdfjsLib from 'pdfjs-dist';
import { formatFileSize } from './utils.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export class PDFProcessor {
  constructor() {
    this.pdf = null;
    this.isProcessing = false;
    this.sharedCanvas = null;
    this.sharedContext = null;
  }

  /**
   * Initialize PDF.js worker
   */
  async initialize() {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }

  /**
   * Validate PDF file
   * @param {File} file - PDF file to validate
   * @returns {Object} Validation result
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return { valid: false, errors };
    }

    if (file.type !== 'application/pdf') {
      errors.push('Please select a PDF file');
    }

    const maxSize = 250 * 1024 * 1024; // 250MB
    if (file.size > maxSize) {
      errors.push(`File too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(maxSize)}`);
    }

    if (file.size === 0) {
      errors.push('File appears to be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Load PDF from file
   * @param {File} file - PDF file to load
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} PDF loading result
   */
  async loadPDF(file, onProgress = null) {
    if (this.isProcessing) {
      throw new Error('PDF processing already in progress');
    }

    this.isProcessing = true;

    try {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join('. '));
      }

      onProgress?.('Reading PDF file...');

      // Use Blob URL instead of reading entire file into ArrayBuffer
      // This saves memory and prevents blocking the main thread
      this.fileUrl = URL.createObjectURL(file);

      onProgress?.('Processing PDF...');

      // Add timeout to PDF loading
      const loadingPromise = pdfjsLib.getDocument({
        url: this.fileUrl,
        verbosity: 0 // Reduce console output
      }).promise;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF loading timed out')), 60000)
      );

      this.pdf = await Promise.race([loadingPromise, timeoutPromise]);

      const numPages = this.pdf.numPages;

      if (numPages === 0) {
        throw new Error('PDF appears to be empty or corrupted');
      }

      return {
        pdf: this.pdf,
        numPages,
        fileName: file.name,
        fileSize: file.size
      };

    } catch (error) {
      console.error('PDF loading error:', error);
      throw this.handlePDFError(error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Render PDF page to canvas
   * @param {number} pageNum - Page number to render
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<HTMLCanvasElement>} Rendered canvas
   */
  async renderPage(pageNum, onProgress = null) {
    if (!this.pdf) {
      throw new Error('No PDF loaded');
    }

    try {
      onProgress?.(`Rendering page ${pageNum}...`);

      const page = await this.pdf.getPage(pageNum);
      // Reduced scale for better performance and smaller data URLs
      const scale = 1.5; // Balanced quality vs performance
      const viewport = page.getViewport({ scale });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);

      // Reuse shared canvas if available, otherwise create one
      if (!this.sharedCanvas) {
        this.sharedCanvas = document.createElement('canvas');
        this.sharedContext = this.sharedCanvas.getContext('2d', { alpha: false });
        this.sharedCanvas.width = width;
        this.sharedCanvas.height = height;
      } else {
        // Resize if needed (clears content)
        if (this.sharedCanvas.width !== width || this.sharedCanvas.height !== height) {
          this.sharedCanvas.width = width;
          this.sharedCanvas.height = height;
        }
        // If dimensions match, existing content is overwritten by fillRect below
      }

      const canvas = this.sharedCanvas;
      const context = this.sharedContext;

      // Fill background white
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Render page to canvas
      const renderContext = {
        canvasContext: context,
        viewport,
        background: 'white'
      };

      await page.render(renderContext).promise;

      console.log(`Rendered page ${pageNum}, canvas size: ${canvas.width}x${canvas.height}`);
      return canvas;

    } catch (error) {
      console.error(`Failed to render page ${pageNum}:`, error);
      throw new Error(`Failed to render page ${pageNum}`);
    }
  }

  /**
   * Convert canvas to Blob URL for performance
   * @param {HTMLCanvasElement} canvas - Canvas to convert
   * @returns {Promise<string>} Blob URL
   */
  async canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.9);
    });
  }

  /**
   * Revoke a Blob URL to free memory
   * @param {string} url - Blob URL to revoke
   */
  revokeBlobUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Convert canvas to data URL (legacy/fallback)
   * @param {HTMLCanvasElement} canvas - Canvas to convert
   * @param {string} format - Image format ('image/png' or 'image/jpeg')
   * @param {number} quality - Image quality (0-1, only for JPEG)
   * @returns {string} Data URL
   */
  canvasToDataURL(canvas, format = 'image/jpeg', quality = 0.85) {
    try {
      // Use JPEG for smaller file sizes, PNG as fallback
      const dataUrl = canvas.toDataURL(format, quality);
      console.log(`Generated data URL, format: ${format}, size: ${dataUrl.length} chars`);
      return dataUrl;
    } catch (error) {
      console.warn(`Failed to generate ${format}, falling back to PNG:`, error);
      // Fallback to PNG if JPEG fails
      return canvas.toDataURL('image/png', 1.0);
    }
  }

  /**
   * Handle PDF-specific errors
   * @param {Error} error - Original error
   * @returns {Error} Processed error
   */
  handlePDFError(error) {
    const message = error.message || 'Unknown error';

    if (message.includes('timed out')) {
      return new Error('PDF loading timed out. The file may be corrupted or too large.');
    }

    if (message.includes('corrupted') || message.includes('InvalidPDFException')) {
      return new Error('The PDF file appears to be corrupted or invalid.');
    }

    if (message.includes('password') || message.includes('protected')) {
      return new Error('The PDF file is password-protected.');
    }

    if (message.includes('not loaded') || message.includes('MissingPDFException')) {
      return new Error('PDF.js library failed to load. Please refresh the page.');
    }

    return new Error(`PDF processing failed: ${message}`);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.pdf) {
      this.pdf.destroy();
      this.pdf = null;
    }
    if (this.fileUrl) {
      URL.revokeObjectURL(this.fileUrl);
      this.fileUrl = null;
    }
    this.isProcessing = false;
    this.sharedCanvas = null;
    this.sharedContext = null;
  }
}