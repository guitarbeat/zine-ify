import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('UIManager', () => {
  let UIManager;
  let dom;

test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><div id="smart-sheet-config-container"></div><div id="toast-container"></div><div id="zine-sheets-container"></div><input id="paper-size-select" /><div id="orientation-toggle"></div><input id="grid-rows" /><input id="grid-cols" /><div id="uploaded-files-list"></div><div id="upload-status"></div><div id="unified-drop-zone"></div><div id="upload-zone"></div>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.matchMedia = () => ({ matches: false });
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
    };

    const module = await import('../../../../src/components/UI/UIManager.js');
    UIManager = module.UIManager;
  });

test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
  });

test('initializes and binds events correctly', () => {
    const ui = new UIManager();
    expect(ui.elements).toBeDefined();
    expect(ui.emitter).toBeDefined();
  });

test('cacheElements finds all elements', () => {
    const ui = new UIManager();
    ui.cacheElements();
    expect(ui.elements.zineSheetsContainer).not.toBeNull();
    expect(ui.elements.paperSizeSelect).not.toBeNull();
  });

test('updateUploadedFilesList handles empty array', () => {
    const ui = new UIManager();
    ui.elements.uploadedFilesList = document.createElement('div');
    ui.updateUploadedFilesList([]);
    expect(ui.elements.uploadedFilesList.classList.contains('hidden')).toBe(true);
  });

test('setStatus updates message and tone', () => {
    const ui = new UIManager();
    ui.elements.uploadStatus = document.createElement('div');
    ui.setStatus('Test Message', 'success');
    expect(ui.elements.uploadStatus.textContent).toBe('Test Message');
    expect(ui.elements.uploadStatus.dataset.tone).toBe('success');
  });

test('updateUploadedFilesList renders files correctly', () => {
    const ui = new UIManager();
    ui.elements.uploadedFilesList = document.createElement('div');
    const files = [
      { name: 'test1.pdf', kind: 'pdf', size: 1024 },
      { name: 'test2.jpg', kind: 'image', size: 2048 }
    ];
    ui.updateUploadedFilesList(files);

    expect(ui.elements.uploadedFilesList.classList.contains('hidden')).toBe(false);
    expect(ui.elements.uploadedFilesList.querySelector('.rail-section-title').textContent).toBe('Uploaded Files (2)');
    const items = ui.elements.uploadedFilesList.querySelectorAll('.uploaded-file-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.uploaded-file-name').textContent).toBe('test1.pdf');
    expect(items[1].querySelector('.uploaded-file-name').textContent).toBe('test2.jpg');
  });

test('getPaperDimensions returns correct dimensions based on orientation', () => {
    const ui = new UIManager();

    const portrait = ui.getPaperDimensions('letter', 'portrait');
    expect(portrait.width).toBe(215.9);
    expect(portrait.height).toBe(279.4);

    const landscape = ui.getPaperDimensions('letter', 'landscape');
    expect(landscape.width).toBe(279.4);
    expect(landscape.height).toBe(215.9);
  });

test('normalizeGridInputs falls back to defaults if parsing fails', () => {
    const ui = new UIManager();
    ui.smartSheetConfig = null; // force logic fallback

    // Elements empty strings
    ui.elements.gridRows = document.createElement('input');
    ui.elements.gridRows.value = 'invalid';
    ui.elements.gridCols = document.createElement('input');
    ui.elements.gridCols.value = 'invalid';

    const dims = ui.normalizeGridInputs();
    expect(dims.rows).toBe(2); // DEFAULT_GRID_ROWS
    expect(dims.cols).toBe(4); // DEFAULT_GRID_COLS
  });

test('toggleTheme updates document and localStorage', () => {
    const ui = new UIManager();
    ui.elements.themeIcon = document.createElement('span');

    document.documentElement.setAttribute('data-theme', 'light');

    let storageValue = null;
    const originalSetItem = global.localStorage.setItem;
    const originalGetItem = global.localStorage.getItem;
    global.localStorage.setItem = (key, val) => { storageValue = val; };
    global.localStorage.getItem = () => storageValue;

    ui.toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(storageValue).toBe('dark');
    expect(ui.elements.themeIcon.textContent).toBe('light_mode');

    ui.toggleTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(storageValue).toBe('light');
    expect(ui.elements.themeIcon.textContent).toBe('dark_mode');

    global.localStorage.setItem = originalSetItem;
    global.localStorage.getItem = originalGetItem;
  });

  test('updatePagePreview updates image correctly', () => {
    const ui = new UIManager();

    // Create mock cell
    const cell = document.createElement('div');
    cell.setAttribute('data-page-index', '0');
    cell.innerHTML = '<img class="page-content-img" /><div class="page-placeholder"></div>';

    // Force cache and append
    ui.pageCellCache = new Map([[0, cell]]);
    ui.elements.zineSheetsContainer = document.createElement('div');
    ui.elements.zineSheetsContainer.appendChild(cell);

    ui.updatePagePreview(0, 'test.png');

    expect(cell.querySelector('.page-content-img').src).toContain('test.png');
    expect(cell.querySelector('.page-content-img').classList.contains('hidden')).toBe(false);
    expect(cell.querySelector('.page-placeholder').classList.contains('hidden')).toBe(true);
    expect(cell.classList.contains('has-page')).toBe(true);

    // Test removal
    ui.updatePagePreview(0, null);

    expect(cell.querySelector('.page-content-img').classList.contains('hidden')).toBe(true);
    expect(cell.querySelector('.page-placeholder').classList.contains('hidden')).toBe(false);
    expect(cell.classList.contains('has-page')).toBe(false);
  });

test('syncFoldStepUi updates active classes', () => {
    const ui = new UIManager();

    const btn0 = document.createElement('button');
    btn0.setAttribute('data-fold-value', '0');

    const btn1 = document.createElement('button');
    btn1.setAttribute('data-fold-value', '1');

    ui.elements.foldStepButtons = [btn0, btn1];
    ui.elements.foldStatus = document.createElement('div');
    ui.elements.foldHelper = document.createElement('div');

    ui.syncFoldStepUi(1);

    expect(btn0.classList.contains('is-active')).toBe(false);
    expect(btn0.getAttribute('aria-pressed')).toBe('false');
    expect(btn1.classList.contains('is-active')).toBe(true);
    expect(btn1.getAttribute('aria-pressed')).toBe('true');
    expect(ui.elements.foldStatus.textContent).toBe('Folded Strip');
  });

test('updateWorkspaceState enables/disables buttons', () => {
    const ui = new UIManager();

    ui.elements.clearAllBtn = document.createElement('button');
    ui.elements.exportPdfBtn = document.createElement('button');
    ui.elements.view3dBtn = document.createElement('button');

    // with pages
    ui.updateWorkspaceState({ placedCount: 1 });
    expect(ui.elements.clearAllBtn.style.display).toBe('');
    expect(ui.elements.exportPdfBtn.disabled).toBe(false);
    expect(ui.elements.view3dBtn.disabled).toBe(false);

    // empty
    ui.updateWorkspaceState({ placedCount: 0 });
    expect(ui.elements.clearAllBtn.style.display).toBe('none');
    expect(ui.elements.exportPdfBtn.disabled).toBe(true);
    expect(ui.elements.view3dBtn.disabled).toBe(true);
  });
  test('updateUploadedFilesList creates remove button icon using DOM methods', () => {
    const ui = new UIManager();
    ui.elements.uploadedFilesList = document.createElement('div');
    const files = [{ name: 'test.pdf', kind: 'pdf', size: 1024 }];
    ui.updateUploadedFilesList(files);

    const removeBtn = ui.elements.uploadedFilesList.querySelector('.uploaded-file-remove');
    expect(removeBtn).not.toBeNull();
    const iconSpan = removeBtn.querySelector('span.material-symbols-outlined');
    expect(iconSpan).not.toBeNull();
    expect(iconSpan.textContent).toBe('close');
    expect(iconSpan.getAttribute('aria-hidden')).toBe('true');
    expect(iconSpan.style.fontSize).toBe('14px');
  });
  test("orientation toggle updates buttons and emits orientationChanged", () => {
    const toggle = document.getElementById("orientation-toggle");
    toggle.innerHTML = '<button class="orientation-seg-btn" data-value="portrait">Portrait</button><button class="orientation-seg-btn" data-value="landscape">Landscape</button>';
    const [btn1, btn2] = toggle.querySelectorAll(".orientation-seg-btn");

    const ui = new UIManager();
    ui.smartSheetConfig = null;
    ui.elements.orientationToggle = toggle;

    let emitted = null;
    ui.emitter.on("orientationChanged", (e) => { emitted = e; });

    ui.setupEventListeners();

    btn2.click();

    expect(btn1.classList.contains("is-active")).toBe(false);
    expect(btn1.getAttribute("aria-pressed")).toBe("false");
    expect(btn2.classList.contains("is-active")).toBe(true);
    expect(btn2.getAttribute("aria-pressed")).toBe("true");
    expect(emitted).toEqual({ orientation: "landscape" });

    toggle.innerHTML = "";
  });
});
