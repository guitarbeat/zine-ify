import { test, expect } from '@playwright/test';

test.describe('gridStack utils - layoutHasOverlaps', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('returns false for default empty nodes parameter when no grid engine is initialized', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      return {
        defaultArg: fn(),
        emptyArray: fn([])
      };
    });
    expect(result.defaultArg).toBe(false);
    expect(result.emptyArray).toBe(false);
  });

  test('small layout (< 10 nodes): returns false when no nodes overlap', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = [
        { id: '1', x: 0, y: 0, w: 2, h: 2 },
        { id: '2', x: 2, y: 0, w: 2, h: 2 },
        { id: '3', x: 0, y: 2, w: 4, h: 2 }
      ];
      return fn(nodes);
    });
    expect(result).toBe(false);
  });

  test('small layout (< 10 nodes): returns true when nodes overlap', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = [
        { id: '1', x: 0, y: 0, w: 3, h: 2 },
        { id: '2', x: 2, y: 0, w: 3, h: 2 }
      ];
      return fn(nodes);
    });
    expect(result).toBe(true);
  });

  test('small layout (< 10 nodes): ignores overlap check for nodes with identical id', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = [
        { id: '1', x: 0, y: 0, w: 3, h: 2 },
        { id: '1', x: 0, y: 0, w: 3, h: 2 }
      ];
      return fn(nodes);
    });
    expect(result).toBe(false);
  });

  test('medium layout (>= 10 nodes, maxX <= 32): bitwise rowBuffer - returns false when clean', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 12 }, (_, i) => ({
        id: `node-${i}`,
        x: (i % 4) * 3,
        y: Math.floor(i / 4) * 2,
        w: 3,
        h: 2
      }));
      return fn(nodes);
    });
    expect(result).toBe(false);
  });

  test('medium layout (>= 10 nodes, maxX <= 32): bitwise rowBuffer - returns true when overlapping', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 11 }, (_, i) => ({
        id: `node-${i}`,
        x: (i % 4) * 3,
        y: Math.floor(i / 4) * 2,
        w: 3,
        h: 2
      }));
      nodes.push({ id: 'overlap-node', x: 1, y: 1, w: 3, h: 2 });
      return fn(nodes);
    });
    expect(result).toBe(true);
  });

  test('medium layout (>= 10 nodes, maxX <= 32): triggers rowBuffer resizing logic when maxY > 256', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        x: 0,
        y: i * 30, // 9 * 30 + 10 = 280 (exceeds default rowBuffer length 256)
        w: 2,
        h: 10
      }));
      return fn(nodes);
    });
    expect(result).toBe(false);
  });

  test('medium layout (>= 10 nodes, maxX <= 32): covers node width >= 32 mask calculation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node-${i}`,
        x: 0,
        y: i * 2,
        w: 32, // w >= 32 triggers `n.w >= 32 ? ~0 : ...`
        h: 2
      }));
      const clean = fn(nodes);

      // Add an overlapping node
      nodes.push({ id: 'overlap-wide', x: 10, y: 5, w: 2, h: 2 });
      const overlap = fn(nodes);

      return { clean, overlap };
    });
    expect(result.clean).toBe(false);
    expect(result.overlap).toBe(true);
  });

  test('large/wide layout (>= 10 nodes, maxX > 32): reusableSpatialGrid - returns false when clean', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 12 }, (_, i) => ({
        id: `wide-${i}`,
        x: i * 4, // maxX will be 12 * 4 = 48 (> 32)
        y: 0,
        w: 4,
        h: 2
      }));
      return fn(nodes);
    });
    expect(result).toBe(false);
  });

  test('large/wide layout (>= 10 nodes, maxX > 32): reusableSpatialGrid - returns true when overlapping', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 11 }, (_, i) => ({
        id: `wide-${i}`,
        x: i * 4,
        y: 0,
        w: 4,
        h: 2
      }));
      nodes.push({ id: 'wide-overlap', x: 2, y: 0, w: 4, h: 2 });
      return fn(nodes);
    });
    expect(result).toBe(true);
  });

  test('large/wide layout (>= 10 nodes, maxX > 32): triggers sharedSpatialGrid buffer expansion when needed > 1024', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fn = window.__layoutHasOverlaps;
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `huge-${i}`,
        x: i * 5, // maxX = 50 (> 32)
        y: 0,
        w: 5,
        h: 30 // maxY = 30; total cells needed = 50 * 30 = 1500 (> 1024)
      }));
      return fn(nodes);
    });
    expect(result).toBe(false);
  });
});
