import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>', {
    url: "http://localhost"
});
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = (cb) => cb();
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

let AppController;
let toast;

test.describe('AppController', () => {
    test.beforeAll(async () => {
        const mod = await import('../../src/core/AppController.js');
        AppController = mod.AppController;
        const toastMod = await import('../../src/components/Toast.js');
        toast = toastMod.toast;
    });

  test('processFileQueue handles file upload processing error correctly', async () => {
    const app = Object.create(AppController.prototype);

    // Mock required state and UI
    const mockRecord = { name: 'test.jpg', kind: 'image' };
    app.state = {
      isProcessingQueue: false,
      fileQueue: [mockRecord],
      uploadedFiles: []
    };

    let setStatusArgs = null;
    let showProgressCalledWith = null;

    app.ui = {
      setStatus: (msg, type) => { setStatusArgs = { msg, type }; },
      modal: {
        showProgress: (val) => { showProgressCalledWith = val; }
      },
      updateUploadedFilesList: () => {}
    };

    app.updateUploadedFileRecord = function(record, updates) {
      Object.assign(record, updates);
    };

    let toastErrorArgs = null;
    toast.error = (title, message) => {
      toastErrorArgs = { title, message };
    };

    app.processImageUpload = async () => {
      throw new Error('Test image upload error');
    };

    await app.processFileQueue();

    expect(mockRecord.status).toBe('Failed');
    expect(setStatusArgs).toEqual({ msg: 'Failed: test.jpg', type: 'error' });
    expect(toastErrorArgs).toEqual({ title: 'Import Failed', message: 'Test image upload error' });
    expect(showProgressCalledWith).toBe(false);
    expect(app.state.isProcessingQueue).toBe(false);
  });

  test('processFileQueue handles processPdfUpload error correctly', async () => {
    const app = Object.create(AppController.prototype);
    const mockRecord = { name: 'test.pdf', kind: 'pdf', status: 'Pending' };
    app.state = {
      isProcessingQueue: false,
      fileQueue: [mockRecord],
      uploadedFiles: []
    };

    app.updateUploadedFileRecord = function(record, updates) {
      Object.assign(record, updates);
    };

    let setStatusArgs = null;
    let showProgressCalledWith = null;

    app.ui = {
      setStatus: (msg, type) => { setStatusArgs = { msg, type }; },
      modal: {
        showProgress: (val) => { showProgressCalledWith = val; }
      },
      updateUploadedFilesList: () => {}
    };

    let toastErrorArgs = null;
    toast.error = (title, message) => {
      toastErrorArgs = { title, message };
    };

    app.processPdfUpload = async () => {
      throw new Error('Test pdf upload error');
    };

    await app.processFileQueue();

    expect(mockRecord.status).toBe('Failed');
    expect(setStatusArgs).toEqual({ msg: 'Failed: test.pdf', type: 'error' });
    expect(toastErrorArgs).toEqual({ title: 'Import Failed', message: 'Test pdf upload error' });
    expect(showProgressCalledWith).toBe(false);
    expect(app.state.isProcessingQueue).toBe(false);
  });
});
