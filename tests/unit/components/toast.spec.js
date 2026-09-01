import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
import DOMPurify from 'dompurify';

test.describe('Toast Component', () => {
  let dom;
  let originalWindow;
  let originalDocument;
  let originalRaf;
  let originalPurifySanitize;
  let toastModule;

  test.beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost/'
    });

    // Save original globals
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;
    originalPurifySanitize = DOMPurify.sanitize;

    global.window = dom.window;
    global.document = dom.window.document;

    // Initialize DOMPurify factory and override the default, like utils.spec.js does
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
});
