import { test, expect } from '@playwright/test';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('PWA Core', () => {
  let dom;
  let initPwa;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body><pwa-install></pwa-install><button id="pwa-install-trigger"></button></body></html>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.customElements = dom.window.customElements;
    global.CSS = { supports: () => false };
    global.location = dom.window.location;
    global.MouseEvent = dom.window.MouseEvent;
    global.Event = dom.window.Event;

    Object.defineProperty(global, 'navigator', {
      value: {
        ...dom.window.navigator,
        language: 'en-US',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        maxTouchPoints: 0,
        serviceWorker: { register: () => Promise.resolve() }
      },
      writable: true,
      configurable: true
    });
    global.window.matchMedia = () => ({ matches: false });

    const module = await import('../../../src/core/pwa.js');
    initPwa = module.initPwa;
  });

  test.beforeEach(() => {
    document.body.innerHTML = '<pwa-install></pwa-install><button id="pwa-install-trigger"></button>';
    window.__zinePwaPromptEvent = undefined;
  });

  test('initPwa registers service worker on load', () => {
    let registerCalled = false;
    global.navigator.serviceWorker = {
      register: async (url) => {
        if (url === '/sw.js') {
          registerCalled = true;
        }
        return Promise.resolve();
      }
    };

    let loadListener = null;
    global.window.addEventListener = (event, cb) => {
      if (event === 'load') {
        loadListener = cb;
      }
    };

    initPwa();

    expect(loadListener).not.toBeNull();
    loadListener();
    expect(registerCalled).toBe(true);
  });

  test('initPwa does not throw if serviceWorker is missing', () => {
    const originalSw = global.navigator.serviceWorker;
    delete global.navigator.serviceWorker;

    expect(() => initPwa()).not.toThrow();

    global.navigator.serviceWorker = originalSw;
  });

  test('initPwa catches service worker registration errors without throwing', () => {
    let loadListener = null;
    global.window.addEventListener = (event, cb) => {
      if (event === 'load') {
        loadListener = cb;
      }
    };

    global.navigator.serviceWorker = {
      register: () => Promise.reject(new Error('Registration failed'))
    };

    initPwa();

    expect(() => loadListener()).not.toThrow();
  });

  test('initPwa handles missing trigger and install elements gracefully', () => {
    document.body.innerHTML = '';
    expect(() => initPwa()).not.toThrow();
  });

  test('initPwa syncs install trigger state correctly when under standalone mode', () => {
    const installEl = document.querySelector('pwa-install');
    installEl.isUnderStandaloneMode = true;

    initPwa();

    const trigger = document.getElementById('pwa-install-trigger');
    expect(trigger.hidden).toBe(true);
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  test('initPwa syncs install trigger state correctly when not under standalone mode', () => {
    const installEl = document.querySelector('pwa-install');
    installEl.isUnderStandaloneMode = false;

    initPwa();

    const trigger = document.getElementById('pwa-install-trigger');
    expect(trigger.hidden).toBe(false);
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-disabled')).toBe('false');
  });

  test('initPwa wires up install trigger click event', () => {
    initPwa();

    const installEl = document.querySelector('pwa-install');
    let showDialogCalled = false;
    installEl.showDialog = () => {
      showDialogCalled = true;
    };

    const trigger = document.getElementById('pwa-install-trigger');
    trigger.click();

    expect(showDialogCalled).toBe(true);
  });

  test('initPwa attaches captured install prompt event', () => {
    const mockEvent = new Event('beforeinstallprompt');
    window.__zinePwaPromptEvent = mockEvent;

    initPwa();

    const installEl = document.querySelector('pwa-install');
    expect(installEl.externalPromptEvent).toBe(mockEvent);
  });

  test('initPwa wires up pwa-install element events to sync trigger state', () => {
    initPwa();

    const installEl = document.querySelector('pwa-install');
    const trigger = document.getElementById('pwa-install-trigger');

    // First hide the trigger manually
    trigger.hidden = true;
    trigger.disabled = true;
    trigger.setAttribute('aria-disabled', 'true');

    // Fire event and check if state was reset (it resets to false because isUnderStandaloneMode is false)
    installEl.isUnderStandaloneMode = false;
    installEl.dispatchEvent(new Event('pwa-install-available-event'));

    expect(trigger.hidden).toBe(false);
    expect(trigger.disabled).toBe(false);

    // Try again with true
    installEl.isUnderStandaloneMode = true;
    installEl.dispatchEvent(new Event('pwa-install-success-event'));

    expect(trigger.hidden).toBe(true);
    expect(trigger.disabled).toBe(true);
  });
});
