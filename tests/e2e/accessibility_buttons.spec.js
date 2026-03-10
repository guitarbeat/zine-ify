import { test, expect } from '@playwright/test';

test('toolbar buttons have accessible labels and focus states', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.print-sheet');

  const coverZoomBtn = page.locator('button[title="Quick Preview"]').first();
  await expect(coverZoomBtn).toHaveAttribute('aria-label', /Quick Preview/);
  await expect(coverZoomBtn).toHaveClass(/focus-visible:ring-2/);

  const coverCropBtn = page.locator('button[title="Toggle Crop/Zoom"]').first();
  await expect(coverCropBtn).toHaveAttribute('aria-label', /Toggle Crop\/Zoom/);
  await expect(coverCropBtn).toHaveClass(/focus-visible:ring-2/);

  const coverRemoveBtn = page.locator('button[title="Remove Page"]').first();
  await expect(coverRemoveBtn).toHaveAttribute('aria-label', /Remove/);
  await expect(coverRemoveBtn).toHaveClass(/focus-visible:ring-2/);
});
