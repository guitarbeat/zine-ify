import { test, expect } from '@playwright/test';

test.describe('Zine3DViewer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to root to ensure we are served from Vite server
    await page.goto('/');

    // Inject test HTML
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>#container { width: 800px; height: 600px; }</style>
        </head>
        <body>
          <div id="container"></div>
          <script type="module">
            // Import from unbundled source code using dev server!
            import { Zine3DViewer } from '/src/components/Zine3DViewer.js';
            window.Zine3DViewer = Zine3DViewer;
            window.viewerState = {}; // Used to report test state
          </script>
        </body>
      </html>
    `);

    // Wait for the module to load
    await page.waitForFunction(() => window.Zine3DViewer !== undefined);
  });

  test('constructor initializes properties and creates WebGL context', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      const state = {
        isFallbackMode: viewer.isFallbackMode,
        hasScene: !!viewer.scene,
        hasCamera: !!viewer.camera,
        hasRenderer: !!viewer.renderer,
        pages: viewer.pages.length,
        stacks: viewer.stacks.length
      };

      viewer.destroy();
      return state;
    });

    expect(result.isFallbackMode).toBe(false); // In Playwright browser, WebGL is supported
    expect(result.hasScene).toBe(true);
    expect(result.hasCamera).toBe(true);
    expect(result.hasRenderer).toBe(true);
    expect(result.pages).toBe(0);
    expect(result.stacks).toBe(0);
  });

  test('setFoldProgress updates fold progress state and calculates debugFoldState', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      viewer.setFoldProgress(0.5);

      const state = {
        currentFoldProgress: viewer.currentFoldProgress,
        hasDebugFoldState: !!viewer.debugFoldState,
      };

      viewer.destroy();
      return state;
    });

    expect(result.currentFoldProgress).toBe(0.5);
    expect(result.hasDebugFoldState).toBe(true);
  });

  test('createPageMeshes generates stacks and pages with materials', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      const previewPages = Array.from({ length: 8 }, (_, i) => ({ previewUrl: null }));
      viewer.createPageMeshes(previewPages);

      const state = {
        stacksCount: viewer.stacks.length,
        pagesCount: viewer.pages.length,
        hasFrontMaterial: !!viewer.pages[0].frontMaterial,
      };

      viewer.destroy();
      return state;
    });

    expect(result.stacksCount).toBeGreaterThan(0);
    expect(result.pagesCount).toBe(8);
    expect(result.hasFrontMaterial).toBe(true);
  });

  test('loadPages loads page textures and sets up scene elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      const previewPages = Array.from({ length: 8 }, (_, i) => `page${i + 1}.png`);
      viewer.loadPages(previewPages);

      const state = {
        pagesCount: viewer.pages.length,
        seamsCount: viewer.seams.length,
        guidesCount: viewer.guides.length,
        currentFoldProgress: viewer.currentFoldProgress
      };

      viewer.destroy();
      return state;
    });

    expect(result.pagesCount).toBe(8);
    expect(result.seamsCount).toBeGreaterThan(0);
    expect(result.guidesCount).toBeGreaterThan(0);
    expect(result.currentFoldProgress).toBe(0);
  });

  test('createSeams and createGuides generate visual connection elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      const previewPages = Array.from({ length: 8 }, (_, i) => ({ previewUrl: null }));
      viewer.createPageMeshes(previewPages);

      viewer.createSeams();
      viewer.createGuides();

      const state = {
        seamsCount: viewer.seams.length,
        guidesCount: viewer.guides.length,
        hasSlitGuide: viewer.guides.some(g => g.type === 'slit'),
      };

      viewer.destroy();
      return state;
    });

    expect(result.seamsCount).toBeGreaterThan(0);
    expect(result.guidesCount).toBeGreaterThan(0);
    expect(result.hasSlitGuide).toBe(true);
  });

  test('cleanupExistingPages resets meshes and arrays', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');
      const viewer = new window.Zine3DViewer(container);

      const previewPages = Array.from({ length: 8 }, (_, i) => ({ previewUrl: null }));
      viewer.createPageMeshes(previewPages);
      viewer.createSeams();
      viewer.createGuides();

      viewer.cleanupExistingPages();

      const state = {
        pagesLength: viewer.pages.length,
        stacksLength: viewer.stacks.length,
        seamsLength: viewer.seams.length,
        guidesLength: viewer.guides.length,
      };

      viewer.destroy();
      return state;
    });

    expect(result.pagesLength).toBe(0);
    expect(result.stacksLength).toBe(0);
    expect(result.seamsLength).toBe(0);
    expect(result.guidesLength).toBe(0);
  });

  test('initFallbackScene activates if WebGL fails and supports loadPages & setFoldProgress', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.getElementById('container');

      // Force WebGL context creation failure
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, options) {
        if (type.includes('webgl')) return null;
        return origGetContext.call(this, type, options);
      };

      const viewer = new window.Zine3DViewer(container);

      viewer.loadPages(['page1.png', 'page2.png']);
      viewer.setFoldProgress(1.5);

      const state = {
        isFallbackMode: viewer.isFallbackMode,
        hasFallbackCanvas: !!viewer.fallbackCanvas,
        hasFallbackContext: !!viewer.fallbackContext,
        fallbackPagesLength: viewer.fallbackPages.length,
        fallbackFoldProgress: viewer.fallbackFoldProgress
      };

      // Restore original getContext
      HTMLCanvasElement.prototype.getContext = origGetContext;

      viewer.destroy();
      return state;
    });

    expect(result.isFallbackMode).toBe(true);
    expect(result.hasFallbackCanvas).toBe(true);
    expect(result.hasFallbackContext).toBe(true);
    expect(result.fallbackPagesLength).toBe(2);
    expect(result.fallbackFoldProgress).toBe(1.5);
  });
});
