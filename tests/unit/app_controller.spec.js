import { test, expect } from '@playwright/test';
import DOMPurify from 'dompurify';

function setupDomMock() {
  const container = {
    id: 'toast-container',
    setAttribute: () => {},
    appendChild: (child) => { container.children.push(child); },
    children: []
  };

  const body = {
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => {}
    },
    appendChild: () => {}
  };

  const createElement = (tag) => {
    const children = [];
    const attributes = {};
    const classes = new Set();

    const el = {
      tagName: tag.toUpperCase(),
      className: '',
      id: '',
      style: {},
      children,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          if (force !== undefined) {
            if (force) classes.add(c);
            else classes.delete(c);
          } else {
            if (classes.has(c)) classes.delete(c);
            else classes.add(c);
          }
        }
      },
      setAttribute: (k, v) => { attributes[k] = v; },
      getAttribute: (k) => attributes[k],
      appendChild: (child) => { children.push(child); return child; },
      removeChild: (child) => {
        const idx = children.indexOf(child);
        if (idx !== -1) children.splice(idx, 1);
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      remove: () => {},
      closest: () => el,
      querySelector: (selector) => {
        if (selector === '.toast-icon' || selector === '.toast-title' || selector === '.toast-message' || selector === '.toast-close') {
          return createElement('div');
        }
        return createElement('div');
      },
      querySelectorAll: () => [],
      cloneNode: () => createElement(tag)
    };

    if (tag === 'template') {
      el.content = createElement('div');
    }

    return el;
  };

  global.window = {
    location: { search: '' },
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  global.document = {
    getElementById: (id) => (id === 'toast-container' ? container : null),
    querySelector: () => createElement('div'),
    querySelectorAll: () => [],
    createElement,
    body,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  global.HTMLElement = class {};
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  Object.defineProperty(global, 'navigator', {
    value: { userAgent: 'node' },
    writable: true,
    configurable: true
  });

  const purify = DOMPurify(global.window);
  DOMPurify.sanitize = purify.sanitize ? purify.sanitize.bind(purify) : () => createElement('div');
}

test.describe('AppController', () => {
  test.beforeEach(() => {
    setupDomMock();
  });

  test.afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.localStorage;
    delete global.requestAnimationFrame;
  });

  test('init handles pdfProcessor.initialize error correctly', async () => {
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
    /* eslint-disable-next-line no-console */
    const originalConsoleError = console.error;
    /* eslint-disable-next-line no-console */
    console.error = (msg) => {
      consoleErrorMsg = msg;
    };

    const originalInitialize = PDFProcessor.prototype.initialize;
    PDFProcessor.prototype.initialize = async () => {
      /* eslint-disable-next-line no-console */
      console.error('Mock PDF initialization failure');
      throw new Error('Mock PDF initialization failure');
    };

    try {
      const controller = new AppController();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(toastErrorTitle).toBe('Initialization Failed');
      expect(toastErrorMessage).toBe('Mock PDF initialization failure');
      expect(consoleErrorMsg).toBe('Mock PDF initialization failure');
      expect(controller).toBeDefined();
    } finally {
      PDFProcessor.prototype.initialize = originalInitialize;
      toast.error = originalToastError;
      /* eslint-disable-next-line no-console */
      console.error = originalConsoleError;
    }
  });

  test.describe('handlePrint', () => {
    test('shows warning toast when no pages are filled', async () => {
      const { AppController } = await import('../../src/core/AppController.js');
      const { toast } = await import('../../src/components/Toast.js');
      const { PDFProcessor } = await import('../../src/services/PDFProcessor.js');

      const originalInitialize = PDFProcessor.prototype.initialize;
      PDFProcessor.prototype.initialize = async () => {};

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
        PDFProcessor.prototype.initialize = originalInitialize;
        toast.warning = originalWarning;
      }
    });

    test('calls exportService.handlePrint and shows error toast on rejection', async () => {
      const { AppController } = await import('../../src/core/AppController.js');
      const { toast } = await import('../../src/components/Toast.js');
      const { PDFProcessor } = await import('../../src/services/PDFProcessor.js');

      const originalInitialize = PDFProcessor.prototype.initialize;
      PDFProcessor.prototype.initialize = async () => {};

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

        // Allow microtask queue to process exportService.handlePrint().catch(...)
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(errorTitle).toBe('Print Failed');
        expect(errorMessage).toBe('Printer disconnected');
      } finally {
        PDFProcessor.prototype.initialize = originalInitialize;
        toast.error = originalError;
      }
    });

    test('falls back to default error message if error message is missing', async () => {
      const { AppController } = await import('../../src/core/AppController.js');
      const { toast } = await import('../../src/components/Toast.js');
      const { PDFProcessor } = await import('../../src/services/PDFProcessor.js');

      const originalInitialize = PDFProcessor.prototype.initialize;
      PDFProcessor.prototype.initialize = async () => {};

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
        PDFProcessor.prototype.initialize = originalInitialize;
        toast.error = originalError;
      }
    });
  });
});
