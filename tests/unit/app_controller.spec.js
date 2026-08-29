import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

test.describe('AppController', () => {
  let originalInitialize;
  let originalToastError;

  test.beforeEach(async () => {
    // Need JSDOM since Toast evaluates `document` at top-level execution
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body><div id="toast-container"></div></body></html>', {
      url: 'http://localhost/'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.localStorage = dom.window.localStorage;
    global.window.matchMedia = () => ({ matches: false, addEventListener: () => {} });
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  });

  test.afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.localStorage;
    delete global.requestAnimationFrame;
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

    originalInitialize = PDFProcessor.prototype.initialize;
    PDFProcessor.prototype.initialize = async () => {
      throw new Error('Mock PDF initialization failure');
    };

    try {
      const controller = new AppController();

      // wait for the catch block to execute.
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(toastErrorTitle).toBe('Initialization Failed');
      expect(toastErrorMessage).toBe('Mock PDF initialization failure');
      expect(controller).toBeDefined();
    } finally {
      // restore
      PDFProcessor.prototype.initialize = originalInitialize;
      toast.error = originalToastError;
    }
  });

  test('processFileQueue handles error when processing image upload fails', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let toastErrorTitle = null;
    let toastErrorMessage = null;
    originalToastError = toast.error;
    toast.error = (title, message) => {
      toastErrorTitle = title;
      toastErrorMessage = message;
    };

    try {
      const controller = new AppController();
      let statusText = null;
      let statusType = null;
      controller.ui.setStatus = (text, type) => {
        statusText = text;
        statusType = type;
      };

      let progressShown = null;
      controller.ui.modal.showProgress = (show) => {
        progressShown = show;
      };

      controller.processImageUpload = async () => {
        throw new Error('Image parsing failed');
      };

      const record = {
        name: 'sample-image.png',
        kind: 'image',
        file: new Blob([''], { type: 'image/png' }),
        status: 'Pending'
      };

      controller.state.uploadedFiles = [record];
      controller.state.fileQueue = [record];

      await controller.processFileQueue();

      expect(record.status).toBe('Failed');
      expect(statusText).toBe('Failed: sample-image.png');
      expect(statusType).toBe('error');
      expect(toastErrorTitle).toBe('Import Failed');
      expect(toastErrorMessage).toBe('Image parsing failed');
      expect(progressShown).toBe(false);
      expect(controller.state.isProcessingQueue).toBe(false);
    } finally {
      toast.error = originalToastError;
    }
  });

  test('processFileQueue handles error when processing PDF upload fails', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let toastErrorTitle = null;
    let toastErrorMessage = null;
    originalToastError = toast.error;
    toast.error = (title, message) => {
      toastErrorTitle = title;
      toastErrorMessage = message;
    };

    try {
      const controller = new AppController();
      let statusText = null;
      let statusType = null;
      controller.ui.setStatus = (text, type) => {
        statusText = text;
        statusType = type;
      };

      let progressShown = null;
      controller.ui.modal.showProgress = (show) => {
        progressShown = show;
      };

      controller.processPdfUpload = async () => {
        throw new Error('Corrupted PDF file');
      };

      const record = {
        name: 'corrupted.pdf',
        kind: 'pdf',
        file: new Blob([''], { type: 'application/pdf' }),
        status: 'Pending'
      };

      controller.state.uploadedFiles = [record];
      controller.state.fileQueue = [record];

      await controller.processFileQueue();

      expect(record.status).toBe('Failed');
      expect(statusText).toBe('Failed: corrupted.pdf');
      expect(statusType).toBe('error');
      expect(toastErrorTitle).toBe('Import Failed');
      expect(toastErrorMessage).toBe('Corrupted PDF file');
      expect(progressShown).toBe(false);
      expect(controller.state.isProcessingQueue).toBe(false);
    } finally {
      toast.error = originalToastError;
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

  test('handlePrint shows warning toast when no pages are filled', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let warningTitle = null;
    let warningMessage = null;
    const originalWarning = toast.warning;
    toast.warning = (title, message) => {
      warningTitle = title;
      warningMessage = message;
    };

    try {
      const controller = new AppController();
      controller.state.getFilledPageCount = () => 0;
      controller.handlePrint();
      expect(warningTitle).toBe('No pages yet');
      expect(warningMessage).toBe('Upload a PDF or images to get started');
    } finally {
      toast.warning = originalWarning;
    }
  });

  test('handlePrint shows error toast when exportService.handlePrint rejects', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let errorTitle = null;
    let errorMessage = null;
    const originalError = toast.error;
    toast.error = (title, message) => {
      errorTitle = title;
      errorMessage = message;
    };

    try {
      const controller = new AppController();
      controller.state.getFilledPageCount = () => 1;
      controller.exportService.handlePrint = () => Promise.reject(new Error('Printer disconnected'));
      controller.handlePrint();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(errorTitle).toBe('Print Failed');
      expect(errorMessage).toBe('Printer disconnected');
    } finally {
      toast.error = originalError;
    }
  });

  test('handlePrint falls back to default error message if error message is missing', async () => {
    const { AppController } = await import('../../src/core/AppController.js');
    const { toast } = await import('../../src/components/Toast.js');

    let errorTitle = null;
    let errorMessage = null;
    const originalError = toast.error;
    toast.error = (title, message) => {
      errorTitle = title;
      errorMessage = message;
    };

    try {
      const controller = new AppController();
      controller.state.getFilledPageCount = () => 1;
      controller.exportService.handlePrint = () => Promise.reject({});
      controller.handlePrint();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(errorTitle).toBe('Print Failed');
      expect(errorMessage).toBe('Unable to print.');
    } finally {
      toast.error = originalError;
    }
  });
});
