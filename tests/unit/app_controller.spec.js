import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import mitt from 'mitt';
import dompurify from 'dompurify';

test.describe('AppController', () => {
  let AppController;
  let controller;
  let toastModule;
  let originalToast;
  let mockUiInstance;

  test.beforeAll(async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="workspace"></div><div id="controls"></div></body></html>', {
      url: 'http://localhost/'
    });
    global.window = dom.window;
    global.document = dom.window.document;

    if (!global.navigator) {
      global.navigator = dom.window.navigator;
    } else {
      Object.defineProperty(global, 'navigator', {
        value: dom.window.navigator,
        writable: true,
        configurable: true
      });
    }

    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };

    global.window.HTMLCanvasElement.prototype.getContext = () => ({
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      setTransform: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      measureText: () => ({ width: 0 })
    });

    global.window.matchMedia = () => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {}
    });

    const purify = dompurify(dom.window);
    global.DOMPurify = purify;
    dompurify.sanitize = purify.sanitize;

    const module = await import('../../src/core/AppController.js');
    AppController = module.AppController;

    toastModule = await import('../../src/components/Toast.js');
    originalToast = { ...toastModule.toast };
  });

  test.afterAll(() => {
    Object.assign(toastModule.toast, originalToast);
  });

  test.beforeEach(() => {
    toastModule.toast.info = () => {};
    toastModule.toast.success = () => {};
    toastModule.toast.error = () => {};
    toastModule.toast.warning = () => {};

    controller = new AppController();

    mockUiInstance = {
      emitter: mitt(),
      on(event, handler) { this.emitter.on(event, handler); },
      off(event, handler) { this.emitter.off(event, handler); },
      emit(event, data) { this.emitter.emit(event, data); },
      syncPaperSettings: () => {},
      setStatus: () => {},
      generateLayout: () => {},
      updatePagePreview: () => {},
      setPageFlip: () => {},
      setPageZoom: () => {},
      updateWorkspaceState: () => {},
      toggle3DModal: () => {},
      updateUploadedFilesList: () => {},
      modal: { showProgress: () => {} }
    };
    controller.ui = mockUiInstance;

    controller.pdfProcessor = {
      initialize: async () => {},
      revokeBlobUrl: () => {}
    };

    controller.exportService = {
      handleExport: async () => {},
      handlePrint: async () => {}
    };

    controller.setupEventListeners();
  });

  test('constructor initializes core dependencies', () => {
    expect(controller.state).toBeDefined();
    expect(controller.undoManager).toBeDefined();
    expect(controller.pdfProcessor).toBeDefined();
    expect(controller.ui).toBeDefined();
    expect(controller.exportService).toBeDefined();
    expect(controller.previewAssetUrls).toEqual([]);
  });

  test('init() initializes pdfProcessor and renders layout', async () => {
    let pdfProcessorInitialized = false;
    controller.pdfProcessor.initialize = async () => {
      pdfProcessorInitialized = true;
    };
    let renderCalled = false;
    controller.renderCurrentLayout = () => {
      renderCalled = true;
    };

    await controller.init();

    expect(pdfProcessorInitialized).toBe(true);
    expect(renderCalled).toBe(true);
  });

  test('handleGridSizeChanged() updates grid size and renders layout', () => {
    let renderCalled = false;
    controller.renderCurrentLayout = () => {
      renderCalled = true;
    };

    expect(controller.state.gridSize.rows).toBe(2);

    controller.handleGridSizeChanged({ rows: '3', cols: '3' });

    expect(controller.state.gridSize).toEqual({ rows: 3, cols: 3 });
    expect(controller.state.workflowPreviewed).toBe(false);
    expect(renderCalled).toBe(true);
  });

  test('handlePageFlipped() updates page flip state and creates snapshot', () => {
    controller.state.allPageImages[0] = 'mock-url';
    let pushedSnapshot = false;
    controller._pushSnapshot = () => { pushedSnapshot = true; };

    expect(controller.state.pageFlips[0]).toBeFalsy();

    controller.handlePageFlipped(0);

    expect(controller.state.pageFlips[0]).toBe(true);
    expect(pushedSnapshot).toBe(true);

    controller.handlePageFlipped(0);
    expect(controller.state.pageFlips[0]).toBe(false);
  });

  test('handlePageFlipped() ignores empty pages', () => {
    controller.state.allPageImages[0] = null;
    let pushedSnapshot = false;
    controller._pushSnapshot = () => { pushedSnapshot = true; };

    controller.handlePageFlipped(0);

    expect(controller.state.pageFlips[0]).toBeFalsy();
    expect(pushedSnapshot).toBe(false);
  });

  test('handlePageRemoved() clears page and creates snapshot', () => {
    controller.state.allPageImages[0] = 'mock-url';
    controller.state.pageFlips[0] = true;
    controller.state.pageZooms[0] = true;
    controller.state.totalPages = 1;

    let pushedSnapshot = false;
    controller._pushSnapshot = () => { pushedSnapshot = true; };
    let renderCalled = false;
    controller.renderCurrentLayout = () => { renderCalled = true; };
    let clearBlankSlotsCalled = false;
    controller.clearBlankSlots = () => { clearBlankSlotsCalled = true; };

    controller.handlePageRemoved(0);

    expect(pushedSnapshot).toBe(true);
    expect(controller.state.allPageImages[0]).toBeNull();
    expect(controller.state.pageFlips[0]).toBe(false);
    expect(controller.state.pageZooms[0]).toBe(false);
    expect(controller.state.totalPages).toBe(0);
    expect(clearBlankSlotsCalled).toBe(true);
    expect(renderCalled).toBe(true);
  });

  test('handleClearAll() resets state and UI', () => {
    controller.state.allPageImages[0] = 'mock-url';
    controller.state.totalPages = 1;

    let pushedSnapshot = false;
    controller._pushSnapshot = () => { pushedSnapshot = true; };
    let renderCalled = false;
    controller.renderCurrentLayout = () => { renderCalled = true; };

    controller.handleClearAll();

    expect(pushedSnapshot).toBe(true);
    expect(controller.state.allPageImages[0]).toBeNull();
    expect(controller.state.totalPages).toBe(0);
    expect(renderCalled).toBe(true);
  });
});
