import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

test.describe('LayoutRenderer Component', () => {
  let LayoutRenderer;
  let dom;
  let container;
  let cellTemplate;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.window = dom.window;
    global.document = dom.window.document;

    // Polyfill for clientWidth / clientHeight
    Object.defineProperty(document.documentElement, 'clientWidth', { value: 1024, configurable: true });
    Object.defineProperty(document.documentElement, 'clientHeight', { value: 768, configurable: true });

    const module = await import('../../../src/components/UI/LayoutRenderer.js');
    LayoutRenderer = module.LayoutRenderer;
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
  });

  test.beforeEach(() => {
    document.body.innerHTML = '';

    container = document.createElement('div');
    container.id = 'layout-container';
    document.body.appendChild(container);

    cellTemplate = document.createElement('template');
    cellTemplate.innerHTML = `
      <div class="page-content-wrapper">
        <img class="page-content-img" src="" alt="" />
        <span class="page-label"></span>
        <div class="page-toolbar">
          <button class="crop-btn"></button>
          <button class="flip-btn"></button>
        </div>
      </div>
    `;
    document.body.appendChild(cellTemplate);
  });

  test('constructor sets container and cellTemplate', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    expect(renderer.container).toBe(container);
    expect(renderer.cellTemplate).toBe(cellTemplate);
  });

  test('normalizeSlotConfig handles raw number', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const template = {
      layout: [4, 1, 2, 3],
      upsideDownPages: [4, 1]
    };

    const config = renderer.normalizeSlotConfig(template, 0);
    expect(config).toEqual({ page: 4, upsideDown: true });

    const config2 = renderer.normalizeSlotConfig(template, 2);
    expect(config2).toEqual({ page: 2, upsideDown: false });
  });

  test('normalizeSlotConfig handles object', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const template = {
      layout: [
        { page: 8, upsideDown: true },
        { page: 1, upsideDown: false }
      ]
    };

    const config = renderer.normalizeSlotConfig(template, 0);
    expect(config).toEqual({ page: 8, upsideDown: true });
  });

  test('normalizeSlotConfig handles missing layout (sequential fallback)', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const template = {};

    const config = renderer.normalizeSlotConfig(template, 0);
    expect(config).toEqual({ page: 1, upsideDown: false });
  });

  test('getResponsiveSheetScale calculates correct scale', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);

    // Mock viewport
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

    // Scale for wide paper in normal viewport
    const scale1 = renderer.getResponsiveSheetScale(2000, 1000);
    expect(scale1).toBeLessThan(1);

    // Scale for tall paper
    const scale2 = renderer.getResponsiveSheetScale(500, 2000);
    expect(scale2).toBeLessThan(1);

    // Scale for small paper (should not scale up, max 1)
    const scale3 = renderer.getResponsiveSheetScale(100, 100);
    expect(scale3).toBe(1);

    // Invalid paper size
    const scale4 = renderer.getResponsiveSheetScale(null, null);
    expect(scale4).toBe(1);
  });

  test('createSheetGrid creates correct structure', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const config = {
      sheetNumber: 2,
      template: 'test-template',
      columns: 2,
      rows: 4,
      id: 'sheet-2',
      paper: {
        paperSize: 'A4',
        orientation: 'landscape',
        width: 297,
        height: 210,
        margin: 10
      }
    };

    const { sheetWrapper, grid } = renderer.createSheetGrid(config);

    // Check wrapper
    expect(sheetWrapper.getAttribute('data-sheet')).toBe('2');
    expect(sheetWrapper.getAttribute('data-template')).toBe('test-template');
    expect(sheetWrapper.getAttribute('data-paper-size')).toBe('A4');
    expect(sheetWrapper.getAttribute('data-paper-orientation')).toBe('landscape');
    expect(sheetWrapper.style.aspectRatio).toBe('297 / 210');

    // Check grid
    expect(grid.id).toBe('sheet-2');
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(grid.style.gridTemplateRows).toBe('repeat(4, 1fr)');
    expect(grid.style.position).toBe('absolute');
  });

  test('createPageCell generates interactive cell', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const handlers = {
      onDragStart: () => {},
      onDragOver: () => {},
      onDragLeave: () => {},
      onDrop: () => {},
      onDragEnd: () => {},
      onClick: () => {},
      onFlip: () => {},
      onCrop: () => {}
    };

    const config = {
      pageIndex: 0,
      pageNumber: 8,
      labelText: 'Back Cover (8)',
      accessibleLabelText: 'Back Cover',
      altText: 'Back Cover preview',
      upsideDown: true,
      options: { pageNumbersVisible: true },
      handlers
    };

    const cell = renderer.createPageCell(config);

    expect(cell.getAttribute('data-page-index')).toBe('0');
    expect(cell.getAttribute('data-page')).toBe('8');
    expect(cell.classList.contains('is-template-upside-down')).toBe(true);

    const label = cell.querySelector('.page-label');
    expect(label.textContent).toBe('Back Cover (8)');

    const img = cell.querySelector('.page-content-img');
    expect(img.alt).toBe('Back Cover preview');

    const cropBtn = cell.querySelector('.crop-btn');
    const flipBtn = cell.querySelector('.flip-btn');
    expect(cropBtn.getAttribute('title')).toContain('Back Cover');
    expect(flipBtn.getAttribute('aria-label')).toContain('Back Cover');
  });

  test('render generates full DOM structure for multi-sheet layout', () => {
    const renderer = new LayoutRenderer(container, cellTemplate);
    const template = {
      label: '8-page-zine',
      grid: { rows: 2, cols: 4 },
      layout: [
        { page: 8, upsideDown: true }, { page: 1, upsideDown: true }, { page: 2, upsideDown: true }, { page: 7, upsideDown: true },
        { page: 6, upsideDown: false }, { page: 3, upsideDown: false }, { page: 4, upsideDown: false }, { page: 5, upsideDown: false }
      ],
      cutLines: {
        horizontal: { afterRow: 1, fromPct: 25, toPct: 75 }
      }
    };

    const options = { pageNumbersVisible: true };
    const handlers = {
      onDragStart: () => {},
      onDragOver: () => {},
      onDragLeave: () => {},
      onDrop: () => {},
      onDragEnd: () => {},
      onClick: () => {},
      onFlip: () => {},
      onCrop: () => {}
    };

    // We are generating 12 pages, which means 1.5 sheets (2 sheets total for 8 slots/sheet)
    renderer.render(12, template, options, handlers, { width: 100, height: 100 });

    const sheets = container.querySelectorAll('.print-sheet');
    expect(sheets.length).toBe(2);

    // First sheet check
    const sheet1Grid = sheets[0].querySelector('.zine-grid');
    const sheet1Cells = sheet1Grid.querySelectorAll('.page-cell');
    expect(sheet1Cells.length).toBe(8); // Slots per sheet is 8

    // Check cut line on first sheet
    const cutLine1 = sheet1Grid.querySelector('.sheet-cut-line');
    expect(cutLine1).not.toBeNull();

    // Second sheet check
    const sheet2Grid = sheets[1].querySelector('.zine-grid');
    const sheet2Cells = sheet2Grid.querySelectorAll('.page-cell');
    expect(sheet2Cells.length).toBe(8);
  });
});
