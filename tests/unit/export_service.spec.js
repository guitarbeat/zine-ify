import { test, expect } from '@playwright/test';
import { ExportService } from '../../src/services/ExportService.js';
import { ZINE_TEMPLATES } from '../../src/utils/config.js';

test.describe('ExportService', () => {
  let mockUi;
  let mockState;
  let service;

  test.beforeEach(() => {
    mockUi = {};
    mockState = {
      gridSize: { rows: 2, cols: 4 },
      allPageImages: [
        'page1.jpg', 'page2.jpg', 'page3.jpg', 'page4.jpg',
        'page5.jpg', 'page6.jpg', 'page7.jpg', 'page8.jpg'
      ],
      paperSize: 'letter',
      orientation: 'landscape',
      margin: 0,
      pageFlips: {},
      pageZooms: {}
    };
    service = new ExportService(mockUi, mockState);
    test.afterEach(() => {
    if (global.window) delete global.window;
  });
});

  test('constructor sets ui and state properties', () => {
    expect(service.ui).toBe(mockUi);
    expect(service.state).toBe(mockState);
  });

  test('_resolveSlot returns correct pageNum and upsideDown for mini-zine', () => {
    const template = ZINE_TEMPLATES['mini-8'];
    const slot0 = service._resolveSlot(template, 0);
    expect(slot0).toEqual({ pageNum: 5, upsideDown: true });

    const slot7 = service._resolveSlot(template, 7);
    expect(slot7).toEqual({ pageNum: 1, upsideDown: false });
  });

  test('_resolveSlot returns default when no template provided', () => {
    const slot = service._resolveSlot(null, 3);
    expect(slot).toEqual({ pageNum: 4, upsideDown: false });
  });

  test('getPaperDimensions returns correct dimensions based on orientation', () => {
    const dimsLandscape = service.getPaperDimensions();
    expect(dimsLandscape.width).toBe(279.4);
    expect(dimsLandscape.height).toBe(215.9);

    service.state.orientation = 'portrait';
    const dimsPortrait = service.getPaperDimensions();
    expect(dimsPortrait.width).toBe(215.9);
    expect(dimsPortrait.height).toBe(279.4);
  });

  test('buildSheetsHtml generates HTML string for sheets', () => {
    const html = service.buildSheetsHtml();
    expect(html).toContain('class="sheet"');
    expect(html).toContain('src="page1.jpg"');
    expect(html).toContain('src="page8.jpg"');
    expect((html.match(/class="sheet"/g) || []).length).toBe(1);
  });

  test('buildSheetsHtml handles multiple sheets', () => {
      service.state.allPageImages = new Array(10).fill('page.jpg');
      const html = service.buildSheetsHtml();
      expect((html.match(/class="sheet"/g) || []).length).toBe(2);
  });

  test('buildPrintHtml wraps sheetsHtml in full HTML document', () => {
    const sheetsHtml = '<div class="sheet">Test</div>';
    const dims = { width: 100, height: 200 };
    const html = service.buildPrintHtml(sheetsHtml, dims);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).toContain('@page { size: 100mm 200mm;');
    expect(html).toContain(sheetsHtml);
  });

  test('handleExport throws error if no pages to export', async () => {
      service.state.allPageImages = new Array(8).fill(null);
      await expect(service.handleExport()).rejects.toThrow('No pages to export.');
  });

  test('_drawCell handles image drawing with correct dimensions and rotation', () => {
    const ctx = {
      save: () => {},
      beginPath: () => {},
      rect: () => {},
      clip: () => {},
      translate: () => {},
      rotate: () => {},
      drawImage: () => {},
      restore: () => {}
    };

    let drawImageCalls = [];
    ctx.drawImage = (img, x, y, w, h) => {
      drawImageCalls.push({ img, x, y, w, h });
    };

    let translateCalls = [];
    ctx.translate = (x, y) => {
      translateCalls.push({ x, y });
    };

    let rotateCalls = [];
    ctx.rotate = (rad) => {
        rotateCalls.push(rad);
    };

    const img = { naturalWidth: 100, naturalHeight: 200 };

    service._drawCell(ctx, img, 10, 20, 50, 100, 0, 1, 'contain');
    expect(translateCalls[0]).toEqual({ x: 35, y: 70 });
    expect(rotateCalls.length).toBe(0);
    expect(drawImageCalls[0].w).toBe(50);
    expect(drawImageCalls[0].h).toBe(100);

    translateCalls = [];
    rotateCalls = [];
    drawImageCalls = [];
    service._drawCell(ctx, img, 0, 0, 100, 100, 180, 1, 'contain');
    expect(rotateCalls[0]).toBe(Math.PI);
  });

  test('handlePrint opens window or creates iframe', async () => {
      let openCalled = false;
      let mockWin = {
          document: {
              open: () => {},
              write: () => {},
              close: () => {}
          },
          focus: () => {},
          print: () => { openCalled = true; }
      };

      const originalWindow = global.window;
      global.window = {
          open: () => mockWin
      };

      service.state.allPageImages = new Array(8).fill('page.jpg');
      await service.handlePrint();
      expect(openCalled).toBe(true);

      global.window = originalWindow;
  });

  test('_loadImage returns a promise resolving with an image', async () => {
    const originalImage = global.Image;
    global.Image = class {
        constructor() {
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 10);
        }
    };

    const img = await service._loadImage('test.jpg');
    expect(img).toBeTruthy();

    global.Image = originalImage;
  });


  test('_loadImage handles errors', async () => {
    const originalImage = global.Image;
    global.Image = class {
        constructor() {
            setTimeout(() => {
                if (this.onerror) this.onerror(new Error('Load failed'));
            }, 10);
        }
    };

    await expect(service._loadImage('test.jpg')).rejects.toThrow('Load failed');

    global.Image = originalImage;
  });

});
