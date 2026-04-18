import { test, expect } from '@playwright/test';

test('toolbar buttons have accessible labels and focus states', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.print-sheet');

  const coverZoomBtn = page.locator('button[aria-label^="Quick Preview"]').first();
  await expect(coverZoomBtn).toHaveAttribute('aria-label', /Quick Preview/);
  await expect(coverZoomBtn).toHaveClass(/focus-visible:outline-4/);

  const coverCropBtn = page.locator('button[aria-label^="Toggle Crop or Zoom"]').first();
  await expect(coverCropBtn).toHaveAttribute('aria-label', /Toggle Crop or Zoom/);
  await expect(coverCropBtn).toHaveClass(/focus-visible:outline-4/);

  const coverRemoveBtn = page.locator('button[aria-label^="Remove"]').first();
  await expect(coverRemoveBtn).toHaveAttribute('aria-label', /Remove/);
  await expect(coverRemoveBtn).toHaveClass(/focus-visible:outline-4/);
});
