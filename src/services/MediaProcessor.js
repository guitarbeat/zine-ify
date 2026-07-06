/**
 * MediaProcessor.js
 * Common utilities for canvas manipulation and image processing
 */
export class MediaProcessor {
  /**
   * Create a render target that can stay off the main thread when supported.
   * @param {number} width
   * @param {number} height
   * @returns {{ canvas: HTMLCanvasElement | OffscreenCanvas, context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D }}
   */
  createRenderCanvas(width, height) {
    /** @type {HTMLCanvasElement | OffscreenCanvas} */
    let canvas;

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Failed to acquire canvas context');
    }

    return { canvas, context };
  }

  /**
   * Load an image element from a source URL
   * @param {string} src 
   * @returns {Promise<HTMLImageElement>}
   */
  loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image could not be decoded.'));
      image.src = src;
    });
  }

  /**
   * Convert canvas to Blob URL for performance
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas - Canvas to convert
   * @returns {Promise<string>} Blob URL
   */
  async canvasToBlob(canvas) {
    if (canvas.convertToBlob) {
      // Use native async convertToBlob for OffscreenCanvas
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      return URL.createObjectURL(blob);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg', 0.8);
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
}

export const mediaProcessor = new MediaProcessor();
