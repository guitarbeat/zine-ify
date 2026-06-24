import { test, expect } from '@playwright/test';
import { GRID_DIMENSION_MAX } from '../../src/utils/config.js';

test.describe('Grid DoS Protection', () => {
  test.skip('should clamp large grid inputs to prevent massive DOM node generation (client-side DoS)', async ({ page }) => {
    await page.goto('/');

    const rowsInput = page.locator('#grid-rows');
    const colsInput = page.locator('#grid-cols');
    const gridTotal = page.locator('#grid-total');
    const maxSlots = GRID_DIMENSION_MAX * GRID_DIMENSION_MAX;

    await expect(rowsInput).toBeAttached();
    await expect(colsInput).toBeAttached();

    await rowsInput.evaluate((node) => {
      node.value = '1000';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await colsInput.evaluate((node) => {
      node.value = '1000';
      node.dispatchEvent(new Event('input', { bubbles: true }));
    });


    await expect(rowsInput).toHaveValue(String(GRID_DIMENSION_MAX));
    await expect(colsInput).toHaveValue(String(GRID_DIMENSION_MAX));
    await expect(gridTotal).toHaveText(`${maxSlots} slots`);
    await expect(page.locator('.page-cell')).toHaveCount(maxSlots);
  });
});
