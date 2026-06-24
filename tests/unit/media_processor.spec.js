import { test, expect } from '@playwright/test';
import { MediaProcessor, mediaProcessor } from '../../src/services/MediaProcessor.js';

test.describe('MediaProcessor', () => {
  let processor;

  test.beforeEach(() => {
    processor = new MediaProcessor();
  });

  test.describe('createRenderCanvas', () => {
    test('creates OffscreenCanvas when available', () => {
      global.OffscreenCanvas = class {
        constructor(width, height) {
          this.width = width;
          this.height = height;
        }
        getContext(type, options) {
          return { type, options };
        }
      };

      const { canvas, context } = processor.createRenderCanvas(100, 200);
      expect(canvas).toBeInstanceOf(global.OffscreenCanvas);
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(200);
      expect(context.type).toBe('2d');
      expect(context.options.alpha).toBe(false);

      delete global.OffscreenCanvas;
    });

    test('creates document canvas when OffscreenCanvas is unavailable', () => {
      const originalOffscreenCanvas = global.OffscreenCanvas;
      delete global.OffscreenCanvas;

      global.document = {
        createElement: (tag) => {
          if (tag === 'canvas') {
            return {
              width: 0,
              height: 0,
              getContext: (type, options) => ({ type, options })
            };
          }
        }
      };

      const { canvas, context } = processor.createRenderCanvas(300, 400);
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(400);
      expect(context.type).toBe('2d');
      expect(context.options.alpha).toBe(false);

      delete global.document;
      if (originalOffscreenCanvas !== undefined) {
        global.OffscreenCanvas = originalOffscreenCanvas;
      }
    });

    test('throws an error if context cannot be acquired', () => {
      global.OffscreenCanvas = class {
        constructor(_width, _height) {}
        getContext() { return null; }
      };

      expect(() => processor.createRenderCanvas(100, 100)).toThrow('Failed to acquire canvas context');

      delete global.OffscreenCanvas;
    });
  });

  test.describe('loadImageElement', () => {
    test('resolves with image element on success', async () => {
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
        }
        set src(value) {
          this._src = value;
          setTimeout(() => {
            if (this.onload) { this.onload(); }
          }, 0);
        }
        get src() {
          return this._src;
        }
      };

      const img = await processor.loadImageElement('good.png');
      expect(img).toBeInstanceOf(global.Image);
      expect(img.src).toBe('good.png');

      delete global.Image;
    });

    test('rejects with error on failure', async () => {
      global.Image = class {
        constructor() {
          this.onload = null;
          this.onerror = null;
        }
        set src(value) {
          this._src = value;
          setTimeout(() => {
            if (this.onerror) { this.onerror(); }
          }, 0);
        }
      };

      await expect(processor.loadImageElement('bad.png')).rejects.toThrow('Image could not be decoded.');

      delete global.Image;
    });
  });

  test.describe('canvasToBlob', () => {
    let originalURL;

    test.beforeEach(() => {
      originalURL = global.URL;
    });

    test.afterEach(() => {
      global.URL = originalURL;
    });

    test('uses convertToBlob if available', async () => {
      const mockCanvas = {
        convertToBlob: async (options) => {
          return { size: 100, type: options.type };
        }
      };

      global.URL = {
        createObjectURL: (blob) => `blob:mock-url-${blob.type}`
      };

      const url = await processor.canvasToBlob(mockCanvas);
      expect(url).toBe('blob:mock-url-image/jpeg');
    });

    test('falls back to toBlob if convertToBlob is not available', async () => {
      const mockCanvas = {
        toBlob: (callback, type, _quality) => {
          callback({ size: 100, type });
        }
      };

      global.URL = {
        createObjectURL: (blob) => `blob:mock-url-${blob.type}`
      };

      const url = await processor.canvasToBlob(mockCanvas);
      expect(url).toBe('blob:mock-url-image/jpeg');
    });
  });

  test.describe('revokeBlobUrl', () => {
    let originalURL;
    let revokedUrl;

    test.beforeEach(() => {
      originalURL = global.URL;
      revokedUrl = null;
      global.URL = {
        revokeObjectURL: (url) => { revokedUrl = url; }
      };
    });

    test.afterEach(() => {
      global.URL = originalURL;
    });

    test('revokes valid blob URLs', () => {
      processor.revokeBlobUrl('blob:test');
      expect(revokedUrl).toBe('blob:test');
    });

    test('does not revoke non-blob URLs', () => {
      processor.revokeBlobUrl('http://test');
      expect(revokedUrl).toBeNull();
    });

    test('does not revoke empty or null URLs', () => {
      processor.revokeBlobUrl(null);
      expect(revokedUrl).toBeNull();
      processor.revokeBlobUrl('');
      expect(revokedUrl).toBeNull();
    });
  });

  test('exports a singleton instance', () => {
    expect(mediaProcessor).toBeInstanceOf(MediaProcessor);
  });
});
