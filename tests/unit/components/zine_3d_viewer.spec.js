import { test, expect } from '@playwright/test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

test.describe('Zine3DViewer Unit Tests', () => {
  let Zine3DViewer;
  let dom;
  let container;
  let dummyCanvasContext;

  test.beforeAll(async () => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="container" style="width: 800px; height: 600px;"></div></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
    global.Event = dom.window.Event;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    global.cancelAnimationFrame = (id) => clearTimeout(id);

    dummyCanvasContext = {
      fillRect: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      beginPath: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {}
    };

    HTMLCanvasElement.prototype.getContext = function(type) {
      if (type === '2d') {
        return dummyCanvasContext;
      }
      return null;
    };

    const module = await import('../../../src/components/Zine3DViewer.js');
    Zine3DViewer = module.Zine3DViewer;
  });

  test.beforeEach(() => {
    container = document.getElementById('container');
    container.replaceChildren();
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
  });

  test.afterAll(() => {
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.HTMLCanvasElement;
    delete global.Event;
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  test('initializes in fallback mode when WebGL context fails', () => {
    const viewer = new Zine3DViewer(container);
    expect(viewer.isFallbackMode).toBe(true);
    expect(viewer.fallbackCanvas).not.toBeNull();
    expect(viewer.fallbackContext).not.toBeNull();
    expect(container.contains(viewer.fallbackCanvas)).toBe(true);
    viewer.destroy();
  });

  test('loadPages converts page inputs and triggers fallback rendering in fallback mode', () => {
    const viewer = new Zine3DViewer(container);
    const pageInputs = [
      'page1.png',
      { previewUrl: 'page2.png' },
      { sourceUrl: 'page3.png' },
      null,
      undefined
    ];

    viewer.loadPages(pageInputs);
    expect(viewer.fallbackPages.length).toBe(5);
    expect(viewer.fallbackPages[0].previewUrl).toBe('page1.png');
    expect(viewer.fallbackPages[1].previewUrl).toBe('page2.png');
    expect(viewer.fallbackPages[2].sourceUrl).toBe('page3.png');
    expect(viewer.fallbackPages[3].previewUrl).toBeNull();
    expect(viewer.fallbackPages[4].previewUrl).toBeNull();
    viewer.destroy();
  });

  test('handles loadPages with null, undefined or empty input gracefully', () => {
    const viewer = new Zine3DViewer(container);

    viewer.loadPages(null);
    expect(viewer.fallbackPages).toEqual([]);

    viewer.loadPages(undefined);
    expect(viewer.fallbackPages).toEqual([]);

    viewer.loadPages([]);
    expect(viewer.fallbackPages).toEqual([]);

    viewer.destroy();
  });

  test('setFoldProgress updates fold progress in fallback mode', () => {
    const viewer = new Zine3DViewer(container);
    viewer.loadPages(['page1.jpg', 'page2.jpg']);

    viewer.setFoldProgress(1.5);
    expect(viewer.currentFoldProgress).toBe(1.5);
    expect(viewer.fallbackFoldProgress).toBe(1.5);

    viewer.setFoldProgress(3.0);
    expect(viewer.currentFoldProgress).toBe(3.0);
    expect(viewer.fallbackFoldProgress).toBe(3.0);

    viewer.destroy();
  });

  test('refreshLayout updates fallback canvas dimensions', () => {
    const viewer = new Zine3DViewer(container);
    Object.defineProperty(container, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 750, configurable: true });

    viewer.refreshLayout();
    expect(viewer.fallbackCanvas.width).toBe(1000);
    expect(viewer.fallbackCanvas.height).toBe(750);

    viewer.destroy();
  });

  test('renderFallback returns early if missing fallbackCanvas or fallbackContext', () => {
    const viewer = new Zine3DViewer(container);
    viewer.fallbackCanvas = null;

    expect(() => viewer.renderFallback()).not.toThrow();
    viewer.destroy();
  });

  test('animate returns early in fallback mode', () => {
    const viewer = new Zine3DViewer(container);
    expect(() => viewer.animate()).not.toThrow();
    viewer.destroy();
  });

  test('destroy cleans up DOM and fallback properties', () => {
    const viewer = new Zine3DViewer(container);
    viewer.loadPages(['p1', 'p2']);

    expect(container.children.length).toBe(1);
    viewer.destroy();

    expect(container.children.length).toBe(0);
    expect(viewer.fallbackCanvas).toBeNull();
    expect(viewer.fallbackContext).toBeNull();
    expect(viewer.fallbackPages).toEqual([]);
  });

  test('WebGL mode initialization and mesh creation when WebGL context is available', () => {
    const mockRendererDom = document.createElement('canvas');
    mockRendererDom.classList.add('zine-3d-canvas');

    const mockRenderer = {
      setSize: () => {},
      setPixelRatio: () => {},
      setClearColor: () => {},
      render: () => {},
      dispose: () => {},
      domElement: mockRendererDom,
      shadowMap: {}
    };

    const origInitRenderer = Zine3DViewer.prototype._initRenderer;
    Zine3DViewer.prototype._initRenderer = function() {
      this.renderer = mockRenderer;
      this.container.appendChild(this.renderer.domElement);
      return true;
    };

    const viewer = new Zine3DViewer(container);
    expect(viewer.isFallbackMode).toBe(false);
    expect(viewer.scene).not.toBeNull();
    expect(viewer.camera).not.toBeNull();

    viewer.loadPages(Array.from({ length: 8 }, (_, i) => `page${i + 1}.png`));
    expect(viewer.pages.length).toBe(8);
    expect(viewer.stacks.length).toBe(4);
    expect(viewer.seams.length).toBe(8);
    expect(viewer.guides.length).toBe(6);

    viewer.setFoldProgress(0);
    expect(viewer.currentFoldProgress).toBe(0);

    viewer.setFoldProgress(1.5);
    expect(viewer.currentFoldProgress).toBe(1.5);
    expect(viewer.debugFoldState).not.toBeNull();

    viewer.setFoldProgress(3);
    expect(viewer.currentFoldProgress).toBe(3);

    Object.defineProperty(container, 'clientWidth', { value: 1200, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 900, configurable: true });
    viewer.refreshLayout();

    expect(container.contains(mockRendererDom)).toBe(true);
    viewer.destroy();
    expect(container.contains(mockRendererDom)).toBe(false);

    Zine3DViewer.prototype._initRenderer = origInitRenderer;
  });
});
