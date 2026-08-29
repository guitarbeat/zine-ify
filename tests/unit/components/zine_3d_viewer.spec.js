import { test, expect } from '@playwright/test';

test.describe('Zine3DViewer Unit Tests (Browser / WebGL & Fallback)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>#container { width: 800px; height: 600px; }</style>
        </head>
        <body>
          <div id="container"></div>
          <script type="module">
            import { Zine3DViewer } from '/src/components/Zine3DViewer.js';
            window.Zine3DViewer = Zine3DViewer;
          </script>
        </body>
      </html>
    `);
    await page.waitForFunction(() => window.Zine3DViewer !== undefined);
  });

  test('initializes Zine3DViewer core properties and scene', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);
      const res = {
        isFallbackMode: viewer.isFallbackMode,
        hasScene: !!viewer.scene,
        hasCamera: !!viewer.camera,
        hasRenderer: !!viewer.renderer,
        pagesCount: viewer.pages.length,
        stacksCount: viewer.stacks.length
      };
      viewer.destroy();
      return res;
    });

    expect(result.isFallbackMode).toBe(false);
    expect(result.hasScene).toBe(true);
    expect(result.hasCamera).toBe(true);
    expect(result.hasRenderer).toBe(true);
    expect(result.pagesCount).toBe(0);
    expect(result.stacksCount).toBe(0);
  });

  test('loadPages creates page meshes, seams, guides and updates camera view', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);
      const previewPages = Array.from({ length: 8 }, (_, i) => `page${i + 1}.png`);
      viewer.loadPages(previewPages);

      const res = {
        pagesCount: viewer.pages.length,
        stacksCount: viewer.stacks.length,
        seamsCount: viewer.seams.length,
        guidesCount: viewer.guides.length,
        currentFoldProgress: viewer.currentFoldProgress,
        hasSlitGuide: viewer.guides.some(g => g.type === 'slit')
      };
      viewer.destroy();
      return res;
    });

    expect(result.pagesCount).toBe(8);
    expect(result.stacksCount).toBe(4);
    expect(result.seamsCount).toBe(8);
    expect(result.guidesCount).toBe(6);
    expect(result.currentFoldProgress).toBe(0);
    expect(result.hasSlitGuide).toBe(true);
  });

  test('setFoldProgress updates currentFoldProgress and debugFoldState', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);
      viewer.loadPages(Array.from({ length: 8 }, (_, i) => `page${i + 1}.png`));
      viewer.setFoldProgress(1.5);

      const res = {
        currentFoldProgress: viewer.currentFoldProgress,
        hasDebugFoldState: !!viewer.debugFoldState,
        topFoldAngle: viewer.debugFoldState?.topFoldAngle
      };
      viewer.destroy();
      return res;
    });

    expect(result.currentFoldProgress).toBe(1.5);
    expect(result.hasDebugFoldState).toBe(true);
    expect(typeof result.topFoldAngle).toBe('number');
  });

  test('refreshLayout resizes camera aspect ratio and renderer', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);
      viewer.refreshLayout();

      const res = {
        aspect: viewer.camera.aspect,
        rendererWidth: viewer.renderer.domElement.width,
        rendererHeight: viewer.renderer.domElement.height
      };
      viewer.destroy();
      return res;
    });

    expect(result.aspect).toBeCloseTo(800 / 600, 2);
    expect(result.rendererWidth).toBeGreaterThan(0);
    expect(result.rendererHeight).toBeGreaterThan(0);
  });

  test('initFallbackScene activates fallback mode when WebGL creation fails', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');

      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, options) {
        if (type.includes('webgl')) return null;
        return origGetContext.call(this, type, options);
      };

      const viewer = new window.Zine3DViewer(container);

      viewer.loadPages(['page1.png', 'page2.png']);
      viewer.setFoldProgress(2);

      const res = {
        isFallbackMode: viewer.isFallbackMode,
        hasFallbackCanvas: !!viewer.fallbackCanvas,
        hasFallbackContext: !!viewer.fallbackContext,
        fallbackPagesCount: viewer.fallbackPages.length,
        fallbackFoldProgress: viewer.fallbackFoldProgress
      };

      HTMLCanvasElement.prototype.getContext = origGetContext;
      viewer.destroy();
      return res;
    });

    expect(result.isFallbackMode).toBe(true);
    expect(result.hasFallbackCanvas).toBe(true);
    expect(result.hasFallbackContext).toBe(true);
    expect(result.fallbackPagesCount).toBe(2);
    expect(result.fallbackFoldProgress).toBe(2);
  });

  test('destroy cleans up WebGL resources and container DOM elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);
      viewer.loadPages(Array.from({ length: 8 }, (_, i) => `page${i + 1}.png`));

      const initialChildCount = container.children.length;
      viewer.destroy();
      const finalChildCount = container.children.length;

      return { initialChildCount, finalChildCount, stacksLength: viewer.stacks.length };
    });

    expect(result.initialChildCount).toBe(1);
    expect(result.finalChildCount).toBe(0);
    expect(result.stacksLength).toBe(0);
  });
});
