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
});
