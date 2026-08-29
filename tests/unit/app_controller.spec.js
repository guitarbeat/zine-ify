import { test, expect } from '@playwright/test';

test.describe('AppController', () => {
  let originalInitialize;
  let originalToastError;
  let originalConsoleError;

  test.beforeEach(async () => {
    // Need JSDOM since Toast evaluates `document` at top-level execution
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body><div id="toast-container"></div></body></html>', {
      url: 'http://localhost/'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.localStorage = dom.window.localStorage;
    global.window.matchMedia = () => ({ matches: false, addEventListener: () => {} });
  });

  test.afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.localStorage;
  });

  test('init handles pdfProcessor.initialize error correctly', async () => {
    // Import modules dynamically after jsdom is set
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');
    const { PDFProcessor } = await import('../../src/services/PDFProcessor.js');

    let toastErrorTitle = null;
    let toastErrorMessage = null;
    const originalToastError = toast.error;
    toast.error = (title, message) => {
      toastErrorTitle = title;
      toastErrorMessage = message;
    };

    let consoleErrorMsg = null;
    // eslint-disable-next-line no-console
    originalConsoleError = console.error;
    // eslint-disable-next-line no-console
    console.error = (msg) => {
        consoleErrorMsg = msg;
    };

    originalInitialize = PDFProcessor.prototype.initialize;
    PDFProcessor.prototype.initialize = async () => {
      throw new Error('Mock PDF initialization failure');
    };

    try {
      const controller = new AppController();

      // wait for the catch block to execute.
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(toastErrorTitle).toBe('Initialization Failed');
      expect(toastErrorMessage).toBe('Check console for details.');
      expect(consoleErrorMsg).toBe('Mock PDF initialization failure');
      expect(controller).toBeDefined();
    } finally {
      // restore
      PDFProcessor.prototype.initialize = originalInitialize;
      toast.error = originalToastError;
      // eslint-disable-next-line no-console
      console.error = originalConsoleError;
    }
  });

  test('handleExport handles exportService.handleExport error correctly', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let toastErrorTitle = null;
    let toastErrorMessage = null;
    const originalToastError = toast.error;
    toast.error = (title, message) => {
      toastErrorTitle = title;
      toastErrorMessage = message;
    };

    try {
      const controller = new AppController();

      // Mock filled page count to proceed with export
      controller.state.getFilledPageCount = () => 1;

      // Track modal progress calls
      const progressCalls = [];
      controller.ui.modal = {
        showProgress: (show, message) => {
          progressCalls.push({ show, message });
        }
      };

      // Mock exportService.handleExport to reject
      const mockErrorMessage = 'Export processing failed';
      controller.exportService = {
        handleExport: async () => {
          throw new Error(mockErrorMessage);
        }
      };

      await controller.handleExport();

      expect(toastErrorTitle).toBe('Export Failed');
      expect(toastErrorMessage).toBe(mockErrorMessage);
      expect(progressCalls).toEqual([
        { show: true, message: 'Generating PDF...' },
        { show: false, message: undefined }
      ]);
    } finally {
      toast.error = originalToastError;
    }
  });
});
