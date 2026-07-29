import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

let dom;
let originalToastError;
let originalConsoleError;

test.beforeAll(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = dom.window.localStorage;

  global.window.matchMedia = global.window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };
});

test.describe('AppController', () => {

  test.afterEach(() => {
    if (originalConsoleError) {
      console.error = originalConsoleError;
      originalConsoleError = null;
    }
  });

  test('constructor init catches PDFProcessor error and shows toast', async () => {
    // Intercept console.error
    originalConsoleError = console.error;
    let consoleErrorCalled = false;
    console.error = () => {
      consoleErrorCalled = true;
    };

    // Dynamic import of modules
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');
    const { PDFProcessor } = await import('../../src/services/PDFProcessor.js');

    // Mock pdfProcessor.initialize on the instance OR mock the prototype before instantiation
    const originalInit = PDFProcessor.prototype.initialize;
    let initPromiseReject;
    PDFProcessor.prototype.initialize = () => {
      return new Promise((_, reject) => {
        initPromiseReject = reject;
      });
    };

    // Mock toast.error
    let toastErrorArgs = null;
    originalToastError = toast.error;
    toast.error = (title, msg) => {
      toastErrorArgs = { title, msg };
    };

    // Instantiate AppController
    const controller = new AppController();

    // Trigger the mock error
    initPromiseReject(new Error('Mock PDF init error'));

    // Allow promise rejections to flush
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(toastErrorArgs).not.toBeNull();
    expect(toastErrorArgs.title).toBe('Initialization Failed');
    expect(consoleErrorCalled).toBe(true);

    // restore
    toast.error = originalToastError;
    PDFProcessor.prototype.initialize = originalInit;
  });
});
