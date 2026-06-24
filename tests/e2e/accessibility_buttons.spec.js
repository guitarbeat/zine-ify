import { test, expect } from '@playwright/test';

test.skip('toolbar buttons have accessible labels and focus states', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.print-sheet');

  const coverZoomBtn = page.locator('button[aria-label^="Quick Preview"]').first();
  await expect(coverZoomBtn).toHaveAttribute('aria-label', /Quick Preview/);
  await expect(coverZoomBtn).toHaveClass(/focus:outline-none/);

  const coverCropBtn = page.locator('button[aria-label^="Toggle Crop\\/Zoom"]').first();
  await expect(coverCropBtn).toHaveAttribute('aria-label', /Toggle Crop\/Zoom/);
  await expect(coverCropBtn).toHaveClass(/focus:outline-none/);

  const coverRemoveBtn = page.locator('button[aria-label^="Remove"]').first();
  await expect(coverRemoveBtn).toHaveAttribute('aria-label', /Remove/);
  await expect(coverRemoveBtn).toHaveClass(/focus:outline-none/);
});
