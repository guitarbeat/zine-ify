import { test, expect } from '@playwright/test';
import { ExportService } from '../../src/services/ExportService.js';
import DOMPurify from 'dompurify';

test.describe('ExportService', () => {
  let mockUi;
  let mockState;
  let exportService;

  test.beforeAll(async () => {
    const { JSDOM } = await import('jsdom');
    const { window } = new JSDOM('', { url: 'http://localhost/' });
    global.window = window;
    global.document = window.document;

    const purify = DOMPurify(window);
    DOMPurify.sanitize = purify.sanitize;
  });

  test.beforeEach(() => {
    mockUi = {};
    mockState = {
      allPageImages: Array(8).fill(null),
      pageFlips: {},
      pageZooms: {},
      gridSize: { rows: 2, cols: 4 },
      paperSize: 'letter',
      orientation: 'landscape',
      margin: 0
    };
    exportService = new ExportService(mockUi, mockState);
  });

  test.describe('getPaperDimensions', () => {
    test('returns landscape dimensions for letter', () => {
      mockState.paperSize = 'letter';
      mockState.orientation = 'landscape';
      const dims = exportService.getPaperDimensions();
      expect(dims).toEqual({ width: 279.4, height: 215.9 });
    });

    test('returns portrait dimensions for letter', () => {
      mockState.paperSize = 'letter';
      mockState.orientation = 'portrait';
      const dims = exportService.getPaperDimensions();
      expect(dims).toEqual({ width: 215.9, height: 279.4 });
    });

    test('returns landscape dimensions for a4', () => {
      mockState.paperSize = 'a4';
      mockState.orientation = 'landscape';
      const dims = exportService.getPaperDimensions();
      expect(dims).toEqual({ width: 297, height: 210 });
    });
  });

  test.describe('buildPrintHtml', () => {
    test('wraps sheets HTML correctly', () => {
      const sheetsHtml = '<div class="sheet"></div>';
      const dims = { width: 100, height: 200 };
      const html = exportService.buildPrintHtml(sheetsHtml, dims);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('@page { size: 100mm 200mm; margin: 0; }');
      expect(html).toContain('<div class="sheet"></div>');
    });
  });

  test.describe('buildSheetsHtml', () => {
    test('generates correct HTML for mini-8 template', () => {
      mockState.allPageImages = [
        'url1', 'url2', 'url3', 'url4',
        'url5', 'url6', 'url7', 'url8'
      ];
      mockState.gridSize = { rows: 2, cols: 4 }; // mini-8
      mockState.pageFlips = { 1: true }; // pageIndex 1 flipped
      mockState.pageZooms = { 2: true }; // pageIndex 2 zoomed
      mockState.paperSize = 'letter';
      mockState.orientation = 'landscape';
      mockState.margin = 5;

      const html = exportService.buildSheetsHtml();

      expect(html).toContain('display:grid;');
      expect(html).toContain('grid-template-columns:repeat(4,1fr);');
      expect(html).toContain('grid-template-rows:repeat(2,1fr);');
      expect(html).toContain('src="url1"');
      expect(html).toContain('src="url2"');
      expect(html).toContain('src="url8"');
      expect(html).toContain('alt="Page 1"');

      // zoomed image should have cover
      expect(html).toContain('object-fit:cover');
      expect(html).toContain('object-fit:contain');
    });

    test('handles empty slots with fallback div', () => {
      mockState.allPageImages = ['url1', null, 'url3'];
      mockState.gridSize = { rows: 1, cols: 2 };

      const html = exportService.buildSheetsHtml();
      expect(html).toContain('src="url1"');
      expect(html).toContain('background:#f0f0f0;');
    });

    test('handles basic sequential layout', () => {
        mockState.gridSize = { rows: 2, cols: 2 };
        mockState.allPageImages = ['url1', 'url2', 'url3', 'url4'];

        const html = exportService.buildSheetsHtml();
        expect(html).toContain('grid-template-columns:repeat(2,1fr);');
        expect(html).toContain('grid-template-rows:repeat(2,1fr);');
        expect(html).toContain('alt="Page 1"');
        expect(html).toContain('alt="Page 4"');
    });
  });

  test.describe('handleExport', () => {
    test('throws when no pages to export', async () => {
      mockState.allPageImages = Array(8).fill(null);
      await expect(exportService.handleExport()).rejects.toThrow('No pages to export.');
    });
  });

  test.describe('_drawCell', () => {
    test('calculates dimensions correctly for contain vs cover', () => {
      let drawImageArgs = null;
      let clipCalled = false;
      let restoreCalled = false;

      const mockCtx = {
        save: () => {},
        beginPath: () => {},
        rect: () => {},
        clip: () => { clipCalled = true; },
        translate: () => {},
        rotate: () => {},
        drawImage: (...args) => { drawImageArgs = args; },
        restore: () => { restoreCalled = true; },
      };

      const img = { naturalWidth: 200, naturalHeight: 100 }; // 2:1 aspect
      const cellW = 100;
      const cellH = 100; // 1:1 aspect

      // test contain
      exportService._drawCell(mockCtx, img, 0, 0, cellW, cellH, 0, 1, 'contain');
      // Img aspect > cell aspect. Contains means width matches cell width. Width = 100.
      // Height = 100 / 2 = 50.
      expect(drawImageArgs[3]).toBeCloseTo(100);
      expect(drawImageArgs[4]).toBeCloseTo(50);

      // test cover
      exportService._drawCell(mockCtx, img, 0, 0, cellW, cellH, 0, 1, 'cover');
      // Img aspect > cell aspect. Cover means height matches cell height. Height = 100.
      // Width = 100 * 2 = 200.
      expect(drawImageArgs[3]).toBeCloseTo(200);
      expect(drawImageArgs[4]).toBeCloseTo(100);

      expect(clipCalled).toBe(true);
      expect(restoreCalled).toBe(true);
    });

    test('calculates dimensions correctly for tall images', () => {
      let drawImageArgs = null;
      const mockCtx = {
        save: () => {}, beginPath: () => {}, rect: () => {}, clip: () => {},
        translate: () => {}, rotate: () => {}, restore: () => {},
        drawImage: (...args) => { drawImageArgs = args; },
      };

      const img = { naturalWidth: 100, naturalHeight: 200 }; // 1:2 aspect
      const cellW = 100;
      const cellH = 100; // 1:1 aspect

      // contain: height caps at cell height. Height = 100. Width = 100 / 2 = 50.
      exportService._drawCell(mockCtx, img, 0, 0, cellW, cellH, 0, 1, 'contain');
      expect(drawImageArgs[3]).toBeCloseTo(50);
      expect(drawImageArgs[4]).toBeCloseTo(100);

      // cover: width caps at cell width. Width = 100. Height = 100 * 2 = 200.
      exportService._drawCell(mockCtx, img, 0, 0, cellW, cellH, 0, 1, 'cover');
      expect(drawImageArgs[3]).toBeCloseTo(100);
      expect(drawImageArgs[4]).toBeCloseTo(200);
    });
  });



  test.describe('openPrintWindow', () => {
    test.afterEach(() => {
    });

    test('uses window.open if available', async () => {

      let openHtml = null;
      let printCalled = false;
      let focusCalled = false;

      const mockWin = {
        document: {
          open: () => {},
          write: (html) => { openHtml = html; },
          close: () => {},
        },
        focus: () => { focusCalled = true; },
        print: () => { printCalled = true; },
      };

      global.window = {
        open: () => mockWin
      };

      await exportService.openPrintWindow('<p>Print</p>');

      expect(openHtml).toContain('<p>Print</p>');
      expect(printCalled).toBe(true);
      expect(focusCalled).toBe(true);

    });

    test('falls back to iframe if window.open fails', async () => {
      global.window = {
        open: () => null
      };

      let iframeAppended = false;
      let iframeHtml = null;
      let printCalled = false;
      let removeCalled = false;
      let focusCalled = false;

      const mockIframe = {
        style: {},
        setAttribute: () => {},
        contentDocument: {
          open: () => {},
          write: (html) => { iframeHtml = html; },
          close: () => {}
        },
        contentWindow: {
          focus: () => { focusCalled = true; },
          print: () => { printCalled = true; }
        },
        remove: () => { removeCalled = true; }
      };

      global.document = {
        createElement: (tag) => {
          if (tag === 'iframe') return mockIframe;
          return {};
        },
        body: {
          appendChild: (el) => {
            if (el === mockIframe) {
              iframeAppended = true;
              setTimeout(() => {
                if (el.onload) el.onload();
              }, 50);
            }
          }
        }
      };

      await exportService.openPrintWindow('<p>Iframe Print</p>');

      expect(iframeAppended).toBe(true);
      expect(iframeHtml).toContain('<p>Iframe Print</p>');
      expect(printCalled).toBe(true);
      expect(focusCalled).toBe(true);

      // wait for remove
      await new Promise(r => setTimeout(r, 1100));
      expect(removeCalled).toBe(true);

    });
  });
});
