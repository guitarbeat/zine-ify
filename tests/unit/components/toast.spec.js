import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.requestAnimationFrame = (cb) => { cb(); return 1; };

// Setup DOMPurify
const purify = DOMPurify(dom.window);
DOMPurify.sanitize = purify.sanitize;

let toast;

test.beforeAll(async () => {
  const toastModule = await import('../../../src/components/Toast.js');
  toast = toastModule.toast;
});

test.describe('Toast Component', () => {
  test.beforeEach(() => {
    // Clear toast container if it exists
    const container = document.getElementById('toast-container');
    if (container) {
      container.remove();
    }
    toast.init();
  });

  test('initializes correctly and creates toast container', () => {
    const container = document.getElementById('toast-container');
    expect(container).toBeTruthy();
    expect(container.className).toContain('toast-container');
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('aria-atomic')).toBe('true');
    expect(container.getAttribute('role')).toBe('region');
  });

  test('show method creates a toast element', () => {
    const el = toast.show('success', 'Test Title', 'Test Message', 0);
    expect(el).toBeTruthy();
    expect(el.className).toContain('toast-success');
    expect(el.getAttribute('role')).toBe('status');

    expect(el.querySelector('.toast-title').textContent).toBe('Test Title');
    expect(el.querySelector('.toast-message').textContent).toBe('Test Message');

    const container = document.getElementById('toast-container');
    expect(container.contains(el)).toBe(true);
  });

  test('error toast sets role to alert', () => {
    const el = toast.show('error', 'Error Title', '', 0);
    expect(el.getAttribute('role')).toBe('alert');
  });

  test('message is optional and omitted from DOM if not provided', () => {
    const el = toast.show('info', 'Info Title', '', 0);
    expect(el.querySelector('.toast-message')).toBeNull();
  });

  test('convenience methods work correctly', () => {
    const successEl = toast.success('Success', '', 0);
    expect(successEl.className).toContain('toast-success');

    const errorEl = toast.error('Error', '', 0);
    expect(errorEl.className).toContain('toast-error');

    const warningEl = toast.warning('Warning', '', 0);
    expect(warningEl.className).toContain('toast-warning');

    const infoEl = toast.info('Info', '', 0);
    expect(infoEl.className).toContain('toast-info');
  });

  test('remove method correctly hides and removes toast', async () => {
    const el = toast.show('info', 'To be removed', '', 0);
    expect(el.classList.contains('toast-visible')).toBe(true);

    // Call remove
    toast.remove(el);
    expect(el.classList.contains('toast-visible')).toBe(false);

    // Wait for setTimeout to finish removing from DOM
    await new Promise(resolve => setTimeout(resolve, 310));

    const container = document.getElementById('toast-container');
    expect(container.contains(el)).toBe(false);
  });

  test('close button removes toast', async () => {
    const el = toast.show('info', 'Closable', '', 0);
    const closeBtn = el.querySelector('.toast-close');

    closeBtn.click();

    expect(el.classList.contains('toast-visible')).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 310));

    const container = document.getElementById('toast-container');
    expect(container.contains(el)).toBe(false);
  });

  test('auto close works after duration', async () => {
    const el = toast.show('success', 'Auto close', '', 100);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(el.classList.contains('toast-visible')).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 310));
    const container = document.getElementById('toast-container');
    expect(container.contains(el)).toBe(false);
  });
});
