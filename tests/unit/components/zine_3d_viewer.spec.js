import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
let Zine3DViewer;

test.describe('Zine3DViewer Component', () => {
  let dom;
  let container;
  let originalWindow;
  let originalDocument;
  let originalRaf;
  let originalCaf;
  let originalDevicePixelRatio;
  let originalConsoleError;

  test.beforeAll(async () => {
    const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });

    const module = await import('../../../src/components/Zine3DViewer.js');
    Zine3DViewer = module.Zine3DViewer;
  });

  test.beforeEach(async () => {
    dom = new JSDOM('<!DOCTYPE html><div id="container" style="width: 100px; height: 100px;"></div>', { url: 'http://localhost/' });
    originalWindow = global.window;
    originalDocument = global.document;
    originalRaf = global.requestAnimationFrame;
    originalCaf = global.cancelAnimationFrame;
    originalDevicePixelRatio = global.devicePixelRatio;

    global.window = dom.window;
    global.document = dom.window.document;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = () => {};
    global.window.devicePixelRatio = 1;

    container = document.getElementById('container');

    // Silence JSDOM WebGL/Canvas warnings
    originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' &&
         (args[0].includes('THREE.WebGLRenderer: Error creating WebGL context.') ||
          args[0].includes('Not implemented: HTMLCanvasElement'))) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  test.afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCaf;
    global.devicePixelRatio = originalDevicePixelRatio;
    console.error = originalConsoleError;
  });

  test('should initialize in fallback mode when WebGL context fails', async () => {
    const viewer = new Zine3DViewer(container);
    expect(viewer).toBeDefined();
    expect(viewer.isFallbackMode).toBe(true);
    expect(viewer.fallbackCanvas).toBeDefined();
    expect(viewer.fallbackContext).toBeDefined();
  });

  test('loadPages should work in fallback mode and render fallback canvas', async () => {
    const viewer = new Zine3DViewer(container);
    viewer.loadPages([
      { previewUrl: 'data:image/png;base64,123' },
      { sourceUrl: 'data:image/png;base64,456' },
      null, null, null, null, null, null
    ]);
    expect(viewer.fallbackPages.length).toBe(8);
    expect(viewer.fallbackPages[0].previewUrl).toBe('data:image/png;base64,123');
    expect(viewer.fallbackPages[1].sourceUrl).toBe('data:image/png;base64,456');
  });

  test('setFoldProgress should update fallback state and trigger render', async () => {
    const viewer = new Zine3DViewer(container);
    let renderCalled = false;
    viewer.renderFallback = () => { renderCalled = true; };

    viewer.setFoldProgress(0.75);

    expect(viewer.fallbackFoldProgress).toBe(0.75);
    expect(viewer.currentFoldProgress).toBe(0.75);
    expect(renderCalled).toBe(true);
  });

  test('destroy should clean up fallback resources and event listeners', async () => {
    const viewer = new Zine3DViewer(container);
    const canvas = viewer.fallbackCanvas;

    expect(container.children.length).toBe(1);
    expect(container.children[0]).toBe(canvas);

    viewer.destroy();

    expect(container.children.length).toBe(0);
    expect(viewer.fallbackCanvas).toBeNull();
    expect(viewer.fallbackContext).toBeNull();
    expect(viewer.fallbackPages.length).toBe(0);
  });

  test('refreshLayout should update canvas size in fallback mode', async () => {
    const viewer = new Zine3DViewer(container);

    Object.defineProperty(container, 'clientWidth', { value: 200, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 300, configurable: true });

    viewer.refreshLayout();

    expect(viewer.fallbackCanvas.width).toBe(200);
    expect(viewer.fallbackCanvas.height).toBe(300);
    expect(viewer.fallbackCanvas.style.width).toBe('200px');
    expect(viewer.fallbackCanvas.style.height).toBe('300px');
  });
});
