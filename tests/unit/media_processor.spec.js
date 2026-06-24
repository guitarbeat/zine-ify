import { test, expect } from '@playwright/test';
import { MediaProcessor } from '../../src/services/MediaProcessor.js';

test.describe('MediaProcessor', () => {
  let processor;
  let originalOffscreenCanvas;
  let originalDocument;
  let originalImage;
  let originalURL;
  let originalBlob;

  test.beforeEach(() => {
    processor = new MediaProcessor();
    originalOffscreenCanvas = global.OffscreenCanvas;
    originalDocument = global.document;
    originalImage = global.Image;
    originalURL = global.URL;
    originalBlob = global.Blob;

    // Mock URL object
    if (!global.URL) {
      global.URL = {};
    }
    global.URL.createObjectURL = (blob) => `blob:mock-url-${Math.random()}`;
    global.URL.revokeObjectURL = () => {};

    if (!global.Blob) {
      global.Blob = class Blob {
        constructor(content, options) {
          this.content = content;
          this.options = options;
        }
      };
    }
  });

  test.afterEach(() => {
    global.OffscreenCanvas = originalOffscreenCanvas;
    global.document = originalDocument;
    global.Image = originalImage;
    global.URL = originalURL;
    global.Blob = originalBlob;
  });

  test.describe('createRenderCanvas', () => {
    test('should use OffscreenCanvas if available', () => {
      global.OffscreenCanvas = class OffscreenCanvas {
        constructor(width, height) {
          this.width = width;
          this.height = height;
        }
        getContext(type) {
          if (type === '2d') return { type: 'OffscreenCanvasRenderingContext2D' };
          return null;
        }
      };

      const { canvas, context } = processor.createRenderCanvas(100, 200);
      expect(canvas).toBeInstanceOf(global.OffscreenCanvas);
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(200);
      expect(context.type).toBe('OffscreenCanvasRenderingContext2D');
    });

    test('should fallback to document.createElement if OffscreenCanvas is not available', () => {
      global.OffscreenCanvas = undefined;
      global.document = {
        createElement: (tag) => {
          if (tag === 'canvas') {
            return {
              getContext: (type) => {
                if (type === '2d') return { type: 'CanvasRenderingContext2D' };
                return null;
              },
              width: 0,
              height: 0
            };
          }
          return {};
        }
      };

      const { canvas, context } = processor.createRenderCanvas(150, 250);
      expect(canvas.width).toBe(150);
      expect(canvas.height).toBe(250);
      expect(context.type).toBe('CanvasRenderingContext2D');
    });

    test('should throw error if context cannot be acquired', () => {
      global.OffscreenCanvas = class OffscreenCanvas {
        constructor() {}
        getContext() { return null; }
      };

      expect(() => processor.createRenderCanvas(100, 100)).toThrow('Failed to acquire canvas context');
    });
  });

  test.describe('loadImageElement', () => {
    test('should resolve image on load', async () => {
      global.Image = class Image {
        constructor() {
          this.src = '';
          // Using setTimeout to simulate async load event
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      };

      const img = await processor.loadImageElement('test-image.jpg');
      expect(img).toBeInstanceOf(global.Image);
      expect(img.src).toBe('test-image.jpg');
    });

    test('should reject on error', async () => {
      global.Image = class Image {
        constructor() {
          this.src = '';
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      };

      await expect(processor.loadImageElement('invalid.jpg')).rejects.toThrow('Image could not be decoded.');
    });
  });

  test.describe('canvasToBlob', () => {
    test('should use convertToBlob if available', async () => {
      const mockCanvas = {
        convertToBlob: async (options) => {
          expect(options).toEqual({ type: 'image/jpeg', quality: 0.8 });
          return new global.Blob(['test'], { type: 'image/jpeg' });
        }
      };

      const url = await processor.canvasToBlob(mockCanvas);
      expect(url).toMatch(/^blob:mock-url-/);
    });

    test('should fallback to toBlob if convertToBlob is not available', async () => {
      const mockCanvas = {
        toBlob: (callback, type, quality) => {
          expect(type).toBe('image/jpeg');
          expect(quality).toBe(0.8);
          callback(new global.Blob(['test'], { type: 'image/jpeg' }));
        }
      };

      const url = await processor.canvasToBlob(mockCanvas);
      expect(url).toMatch(/^blob:mock-url-/);
    });
  });

  test.describe('revokeBlobUrl', () => {
    test('should revoke valid blob URLs', () => {
      let revokedUrl = null;
      global.URL.revokeObjectURL = (url) => {
        revokedUrl = url;
      };

      processor.revokeBlobUrl('blob:test-url');
      expect(revokedUrl).toBe('blob:test-url');
    });

    test('should not revoke non-blob URLs', () => {
      let revokedUrl = null;
      global.URL.revokeObjectURL = (url) => {
        revokedUrl = url;
      };

      processor.revokeBlobUrl('http://example.com/image.jpg');
      expect(revokedUrl).toBeNull();

      processor.revokeBlobUrl(null);
      expect(revokedUrl).toBeNull();
    });
  });
});
