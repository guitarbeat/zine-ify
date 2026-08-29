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
    originalToastError = toast.error;
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
});
