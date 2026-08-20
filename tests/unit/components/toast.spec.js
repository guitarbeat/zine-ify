import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

test.describe('Toast Component', () => {
  let dom;
  let originalWindow;
  let originalDocument;
  let originalRaf;
  let Toast;
  let toast;

  test.beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'http://localhost/' });

    // Save original globals if they exist in node test env
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;

    global.window = dom.window;
    global.document = dom.window.document;

    // Mock requestAnimationFrame to execute asynchronously using setTimeout for DOM operations
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

    // Dynamically import module AFTER globals are set to prevent document is not defined
    const module = await import('../../../src/components/Toast.js?v=' + Date.now()); // cache bust
    Toast = module.default ? module.default.Toast : (module.Toast || module.toast.constructor);
    toast = module.toast;

    // Re-initialize the container for the singleton
    toast.container = null;
    toast.init();
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
    if (global.document && global.document.body) {
       global.document.body.innerHTML = '';
    }
  });

  test('initializes and appends container with correct attributes', () => {
    const container = document.getElementById('toast-container');

    expect(container).not.toBeNull();
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('aria-atomic')).toBe('true');
    expect(container.getAttribute('role')).toBe('region');
    expect(container.getAttribute('aria-label')).toBe('Notifications');

    // check that template is initialized
    expect(toast.template).not.toBeNull();
    expect(toast.template.innerHTML).toContain('toast-close');
  });

  test('show method creates and appends toast element', () => {
    const toastElement = toast.show('success', 'Success Title', 'Success Message');

    expect(toastElement.className).toContain('toast toast-success');
    expect(toastElement.querySelector('.toast-title').textContent).toBe('Success Title');
    expect(toastElement.querySelector('.toast-message').textContent).toBe('Success Message');

    // check it is appended
    const container = document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);
  });

  test('show method sets correct role attribute based on type', () => {
    const errorToast = toast.show('error', 'Error Title');
    expect(errorToast.getAttribute('role')).toBe('alert');

    const infoToast = toast.show('info', 'Info Title');
    expect(infoToast.getAttribute('role')).toBe('status');
  });

  test('remove method removes toast element from DOM', async () => {
    const toastElement = toast.show('success', 'Title');

    const container = document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    toast.remove(toastElement);

    // wait for setTimeout(..., 300) to finish
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(container.contains(toastElement)).toBe(false);
  });

  test('_setupAutoClose removes toast automatically', async () => {
    // Use short duration for test
    const duration = 100;
    const toastElement = toast.show('success', 'Title', '', duration);

    const container = document.getElementById('toast-container');
    expect(container.contains(toastElement)).toBe(true);

    // wait for duration + remove timeout (100 + 300 + buffer)
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(container.contains(toastElement)).toBe(false);
  });

  test('convenience methods call show correctly', () => {
    const successToast = toast.success('Success');
    expect(successToast.className).toContain('toast-success');

    const errorToast = toast.error('Error');
    expect(errorToast.className).toContain('toast-error');

    const warningToast = toast.warning('Warning');
    expect(warningToast.className).toContain('toast-warning');

    const infoToast = toast.info('Info');
    expect(infoToast.className).toContain('toast-info');
  });
});
