import { test, expect } from '@playwright/test';

test.describe('GridStack Layout', () => {
  test('recovers from invalid JSON in localStorage', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');

    // Set invalid JSON for the layout
    await page.evaluate(() => {
      localStorage.setItem('zine-grid-v8', '{ bad_json ');
    });

    // Reload to trigger loadLayout
    await page.reload();

    // Verify layout loaded default grid items despite bad JSON
    const items = await page.locator('.grid-stack-item').count();
    expect(items).toBeGreaterThan(0);
  });

  test('handles localStorage.setItem error during layout save without throwing uncaught exceptions', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/');

    // Mock localStorage.setItem to throw QuotaExceededError when grid layout key is set
    await page.evaluate(() => {
      const origSetItem = window.localStorage.setItem.bind(window.localStorage);
      window.localStorage.setItem = (key, val) => {
        if (key.includes('zine-grid')) {
          throw new DOMException('QuotaExceededError: Storage quota exceeded', 'QuotaExceededError');
        }
        return origSetItem(key, val);
      };

      // Trigger change event on grid element which calls saveLayout
      const gridEl = document.querySelector('.grid-stack');
      if (gridEl && gridEl.gridstack) {
        gridEl.gridstack._triggerEvent('change');
      }
    });

    // Ensure no unhandled storage error reached window page error handler
    const storageErrorOccurred = pageErrors.some((msg) => msg.includes('QuotaExceededError'));
    expect(storageErrorOccurred).toBe(false);
  });

  test("detects grid overlaps correctly using spatial grid algorithm", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      if (typeof fn !== "function") {
        return { error: "window.__layoutHasOverlaps is not a function" };
      }

      // 1. Standard grid non-overlapping (12 nodes, <= 32 cols)
      const stdClean = Array.from({ length: 12 }, (_, i) => ({
        id: `n${i}`,
        x: (i % 4) * 3,
        y: Math.floor(i / 4) * 2,
        w: 3,
        h: 2
      }));

      // 2. Standard grid overlapping
      const stdOverlap = [
        ...Array.from({ length: 11 }, (_, i) => ({
          id: `n${i}`,
          x: (i % 4) * 3,
          y: Math.floor(i / 4) * 2,
          w: 3,
          h: 2
        })),
        { id: "n11", x: 1, y: 1, w: 3, h: 2 }
      ];

      // 3. Wide grid non-overlapping (> 32 cols)
      const wideClean = Array.from({ length: 12 }, (_, i) => ({
        id: `n${i}`,
        x: i * 4,
        y: 0,
        w: 4,
        h: 2
      }));

      // 4. Wide grid overlapping
      const wideOverlap = [
        ...Array.from({ length: 11 }, (_, i) => ({
          id: `n${i}`,
          x: i * 4,
          y: 0,
          w: 4,
          h: 2
        })),
        { id: "n11", x: 2, y: 0, w: 4, h: 2 }
      ];

      return {
        stdClean: fn(stdClean),
        stdOverlap: fn(stdOverlap),
        wideClean: fn(wideClean),
        wideOverlap: fn(wideOverlap)
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.stdClean).toBe(false);
    expect(result.stdOverlap).toBe(true);
    expect(result.wideClean).toBe(false);
    expect(result.wideOverlap).toBe(true);
  });

  test("comprehensively tests layoutHasOverlaps edge cases and algorithms", async ({ page }) => {
    await page.goto("/");

    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      if (typeof fn !== "function") {
        return { error: "window.__layoutHasOverlaps is not a function" };
      }

      // Default parameter test: fn()
      const defaultParamResult = fn();

      // Empty array
      const emptyResult = fn([]);

      // Single node
      const singleNodeResult = fn([{ id: 'a', x: 0, y: 0, w: 2, h: 2 }]);

      // Small list (<10 nodes) - Same ID nodes (ignored by nodesOverlap)
      const sameIdResult = fn([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'a', x: 0, y: 0, w: 2, h: 2 }
      ]);

      // Small list (<10 nodes) - Non-overlapping
      const smallClean = fn([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 2, y: 0, w: 2, h: 2 },
        { id: 'c', x: 0, y: 2, w: 2, h: 2 }
      ]);

      // Small list (<10 nodes) - Overlapping
      const smallOverlap = fn([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 1, y: 1, w: 2, h: 2 }
      ]);

      // Small list (<10 nodes) - Edge touching (x + w == next_x)
      const smallTouching = fn([
        { id: 'a', x: 0, y: 0, w: 2, h: 2 },
        { id: 'b', x: 2, y: 0, w: 2, h: 2 },
        { id: 'c', x: 0, y: 2, w: 2, h: 2 }
      ]);

      // Medium list (>= 10 nodes, maxX <= 32) with large Y value to trigger rowBuffer resize
      const mediumLargeY = fn([
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `m${i}`,
          x: 0,
          y: i * 2,
          w: 2,
          h: 2
        })),
        { id: 'm9', x: 0, y: 300, w: 2, h: 10 }
      ]);

      // Medium list (>= 10 nodes, maxX <= 32) with w >= 32 mask branch
      const mediumWideMask = fn([
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `w${i}`,
          x: 0,
          y: i * 2,
          w: 2,
          h: 2
        })),
        { id: 'w9', x: 0, y: 20, w: 32, h: 2 }
      ]);

      // Medium list (>= 10 nodes, maxX <= 32) with overlap on rowBuffer mask
      const mediumOverlap = fn([
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `o${i}`,
          x: 0,
          y: i * 2,
          w: 2,
          h: 2
        })),
        { id: 'o9', x: 1, y: 2, w: 2, h: 2 }
      ]);

      // Spatial grid list (>= 10 nodes, maxX > 32) with large spatial area to test buffer resize
      const spatialLargeBuffer = fn([
        ...Array.from({ length: 9 }, (_, i) => ({
          id: `s${i}`,
          x: i * 5,
          y: 0,
          w: 2,
          h: 2
        })),
        { id: 's9', x: 45, y: 50, w: 5, h: 5 }
      ]);

      return {
        defaultParamResult,
        emptyResult,
        singleNodeResult,
        sameIdResult,
        smallClean,
        smallOverlap,
        smallTouching,
        mediumLargeY,
        mediumWideMask,
        mediumOverlap,
        spatialLargeBuffer
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.defaultParamResult).toBe(false);
    expect(result.emptyResult).toBe(false);
    expect(result.singleNodeResult).toBe(false);
    expect(result.sameIdResult).toBe(false);
    expect(result.smallClean).toBe(false);
    expect(result.smallOverlap).toBe(true);
    expect(result.smallTouching).toBe(false);
    expect(result.mediumLargeY).toBe(false);
    expect(result.mediumWideMask).toBe(false);
    expect(result.mediumOverlap).toBe(true);
    expect(result.spatialLargeBuffer).toBe(false);
  });
});
