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

    // Verify localStorage doesn't have the bad JSON anymore
    const stored = await page.evaluate(() => localStorage.getItem('zine-grid-v8'));

    // It should either be null or a valid JSON object
    expect(stored).not.toBe('{ bad_json ');

    if (stored) {
      expect(() => JSON.parse(stored)).not.toThrow();
    }
  });
});
