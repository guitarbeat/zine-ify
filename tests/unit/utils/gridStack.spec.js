import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { initGridStack } from '../../../src/utils/gridStack.js';

test.describe('gridStack', () => {
  let dom;

  test.beforeAll(async () => {
    // Set up JSDOM globals
    dom = new JSDOM(`<!DOCTYPE html><html><body>
      <div class="grid-stack">
        <div gs-id="brand"></div>
        <div gs-id="canvas"></div>
      </div>
    </body></html>`, { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });

    global.window.matchMedia = () => ({ matches: false, addEventListener: () => {} });
    global.ResizeObserver = class { observe(){} disconnect(){} };
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  });

  test('initGridStack sets up grid correctly and registers window globals', () => {
    expect(global.window.__resetPanelLayout).toBeUndefined();
    expect(global.window.__resizePanels).toBeUndefined();

    initGridStack();

    expect(global.window.__resetPanelLayout).toBeDefined();
    expect(global.window.__resizePanels).toBeDefined();
    expect(typeof global.window.__resetPanelLayout).toBe('function');
    expect(typeof global.window.__resizePanels).toBe('function');
  });

  test('initGridStack works with mobile view', () => {
    // Mock mobile view
    global.window.matchMedia = () => ({ matches: true, addEventListener: () => {} });

    // reset globals to ensure they get assigned again
    delete global.window.__resetPanelLayout;
    delete global.window.__resizePanels;

    initGridStack();

    expect(global.window.__resetPanelLayout).toBeDefined();
    expect(document.body.classList.contains('layout-mobile')).toBe(true);
  });
});
