import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
import DOMPurify from 'dompurify';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('Toast Component', () => {
  let dom;
  let originalWindow;
  let originalDocument;
  let originalRaf;
  let originalPurifySanitize;
  let toastModule;

  test.beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/?expose-toast=1'
    });

    // Save original globals
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;
    originalPurifySanitize = DOMPurify.sanitize;

    global.window = dom.window;
    global.document = dom.window.document;

    // Initialize DOMPurify factory and override the default
    const purify = DOMPurify(global.window);
    DOMPurify.sanitize = purify.sanitize;

    // Mock requestAnimationFrame to execute synchronously
    global.requestAnimationFrame = (cb) => {
      setTimeout(cb, 0);
      return 1;
    };

    // dynamically import the Toast module
    toastModule = await import('../../../src/components/Toast.js?test=' + Date.now());
  });

  test.afterEach(() => {
    // Clean up DOM
    const container = global.document?.getElementById('toast-container');
    if (container) {
      container.remove();
    }

    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
    DOMPurify.sanitize = originalPurifySanitize;
  });

  test('should initialize and create container', () => {
    const { toast } = toastModule;
    expect(toast).toBeDefined();

    const container = global.document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-atomic')).toBe('true');
    expect(container.getAttribute('aria-label')).toBe('Notifications');
  });

  test('should expose singleton toast on window when expose-toast parameter is present', () => {
    expect(global.window.__zineifyToast).toBe(toastModule.toast);
  });

  test('should show a success toast', async () => {
    const { toast } = toastModule;

    // Call success convenience method
    const toastElement = toast.success('Success Title', 'Success Message');

    // Should return the created element
    expect(toastElement).not.toBeNull();
    expect(toastElement.classList.contains('toast-success')).toBe(true);
    expect(toastElement.getAttribute('role')).toBe('status');

    // Verify content
    const title = toastElement.querySelector('.toast-title');
    expect(title.innerHTML).toContain('Success Title');

    const message = toastElement.querySelector('.toast-message');
    expect(message.innerHTML).toContain('Success Message');

    // Wait for the next frame for animation to apply
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(toastElement.classList.contains('toast-visible')).toBe(true);
    expect(toastElement.style.transform).toContain('translateX(0)');
  });

  test('should show an error toast with alert role', () => {
    const { toast } = toastModule;

    const toastElement = toast.error('Error Title');

    expect(toastElement.classList.contains('toast-error')).toBe(true);
    expect(toastElement.getAttribute('role')).toBe('alert'); // Errors should use alert role

    // Message container shouldn't exist if no message provided
    const message = toastElement.querySelector('.toast-message');
    expect(message).toBeNull();
  });

  test('should show warning and info toasts', () => {
    const { toast } = toastModule;

    const warningToast = toast.warning('Warning');
    expect(warningToast.classList.contains('toast-warning')).toBe(true);

    const infoToast = toast.info('Info');
    expect(infoToast.classList.contains('toast-info')).toBe(true);
  });

  test('should sanitize title and message content to prevent XSS', () => {
    const { toast } = toastModule;

    const xssTitle = '<img src=x onerror=alert(1)>Unsafe Title';
    const xssMessage = '<script>alert(2)</script>Unsafe Message';

    const toastElement = toast.show('info', xssTitle, xssMessage);

    const titleEl = toastElement.querySelector('.toast-title');
    expect(titleEl.querySelector('script')).toBeNull();
    expect(titleEl.innerHTML).not.toContain('onerror');

    const messageEl = toastElement.querySelector('.toast-message');
    expect(messageEl.querySelector('script')).toBeNull();
  });

  test('should stack multiple toasts in the container', () => {
    const { toast } = toastModule;

    const toast1 = toast.info('First');
    const toast2 = toast.success('Second');
    const toast3 = toast.error('Third');

    const container = global.document.getElementById('toast-container');
    const toasts = container.querySelectorAll('.toast');

    expect(toasts.length).toBe(3);
    expect(toasts[0]).toBe(toast1);
    expect(toasts[1]).toBe(toast2);
    expect(toasts[2]).toBe(toast3);
  });

  test('should return correct icon SVG for all supported toast types', () => {
    const { toast } = toastModule;

    expect(toast.getIcon('success')).toContain('polyline points="22,4 12,14.01 9,11.01"');
    expect(toast.getIcon('error')).toContain('line x1="15" y1="9" x2="9" y2="15"');
    expect(toast.getIcon('warning')).toContain('line x1="12" y1="9" x2="12" y2="13"');
    expect(toast.getIcon('info')).toContain('path d="M12 16v-4"');
    expect(toast.getIcon('nonexistent')).toContain('path d="M12 16v-4"'); // Fallback to info
  });

  test('should remove a toast after clicking close button', async () => {
    const { toast } = toastModule;
    const toastElement = toast.show('info', 'Closable');

    // It's in the DOM
    const container = global.document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    // Click close
    const closeBtn = toastElement.querySelector('.toast-close');
    closeBtn.click();

    // Class is removed immediately
    expect(toastElement.classList.contains('toast-visible')).toBe(false);

    // Wait for CSS transition timeout
    await new Promise(resolve => setTimeout(resolve, 350));

    // Should be removed from DOM
    expect(container.contains(toastElement)).toBe(false);
  });

  test('should auto-close toast after duration', async () => {
    const { toast } = toastModule;
    const toastElement = toast.show('info', 'Auto Close', 'Msg', 50); // 50ms duration

    const container = global.document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    // Wait for duration + CSS transition (50 + 300) + a little buffer
    await new Promise(resolve => setTimeout(resolve, 400));

    // Should be removed from DOM
    expect(container.contains(toastElement)).toBe(false);
  });

  test('should fall back to info icon if type is unknown', () => {
    const { toast } = toastModule;

    const toastElement = toast.show('unknown_type', 'Title');
    const iconContainer = toastElement.querySelector('.toast-icon');

    // Should contain the info SVG (the fallback)
    expect(iconContainer.innerHTML).toContain('<circle cx="12" cy="12" r="10"');
    expect(iconContainer.innerHTML).toContain('<path d="M12 16v-4"');
  });

  test('should reuse existing container if toast-container element already exists', () => {
    // Remove existing container if any
    const oldContainer = global.document.getElementById('toast-container');
    if (oldContainer) {
      oldContainer.remove();
    }

    // Pre-create container
    const existingContainer = global.document.createElement('div');
    existingContainer.id = 'toast-container';
    global.document.body.appendChild(existingContainer);

    // Instantiate Toast class constructor directly
    const ToastClass = toastModule.toast.constructor;
    const newToastInstance = new ToastClass();
    expect(newToastInstance.container).toBe(existingContainer);
  });

  test('should not auto-close toast if duration is 0 or negative', async () => {
    const { toast } = toastModule;
    const toastElement = toast.show('info', 'Persistent Toast', '', 0);

    const container = global.document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    // Wait 100ms and verify it remains in DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(container.contains(toastElement)).toBe(true);
  });

  test('should safely handle remove call when toast is already detached', async () => {
    const { toast } = toastModule;
    const toastElement = toast.show('info', 'Detached Test');

    // Manually remove before toast.remove transition finishes
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }

    // Call remove - should not throw error
    expect(() => toast.remove(toastElement)).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 350));
  });

  test('should not expose singleton toast on window when expose-toast parameter is absent', async () => {
    // Set URL without expose-toast parameter
    const noExposeDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/'
    });

    const savedWindow = global.window;
    const savedDocument = global.document;

    global.window = noExposeDom.window;
    global.document = noExposeDom.window.document;

    const freshModule = await import('../../../src/components/Toast.js?noexpose=' + Date.now());
    expect(freshModule.toast).toBeDefined();
    expect(global.window.__zineifyToast).toBeUndefined();

    global.window = savedWindow;
    global.document = savedDocument;
  });

  test('should default to 5000ms duration when duration is omitted in show()', async () => {
    const { toast } = toastModule;
    let timeoutCb;
    let timeoutDelay;

    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (cb, delay) => {
      if (delay === 5000) {
        timeoutCb = cb;
        timeoutDelay = delay;
      }
      return originalSetTimeout(cb, delay);
    };

    try {
      toast.show('info', 'Default Duration Test');
      expect(timeoutDelay).toBe(5000);
      expect(typeof timeoutCb).toBe('function');
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });

  test('should handle auto-close callback safely if toast is removed from DOM before timer fires', async () => {
    const { toast } = toastModule;
    const toastElement = toast.show('info', 'Timer Pre-removed', 'Msg', 50);

    const container = global.document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    // Manually remove toast before auto-close timer fires
    toastElement.remove();

    // Wait for timer to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(container.contains(toastElement)).toBe(false);
  });
});
