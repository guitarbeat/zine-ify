
import { test, expect } from '@playwright/test';

test('flip buttons have accessible labels', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('/');

  // 2. Wait for layout generation (should be automatic on load)
  await page.waitForSelector('.print-sheet');

  // 3. Check first page (Cover)
  const coverFlipBtn = page.locator('button[title="Flip Cover"]');
  await expect(coverFlipBtn).toBeVisible();
  await expect(coverFlipBtn).toHaveAttribute('aria-label', 'Rotate Cover 180 degrees');

  // 4. Check second page (Page 2)
  const page2FlipBtn = page.locator('button[title="Flip Page 2"]');
  await expect(page2FlipBtn).toBeVisible();
  await expect(page2FlipBtn).toHaveAttribute('aria-label', 'Rotate Page 2 180 degrees');

  // 5. Check last page (Back) - assuming 8 page default
  const backFlipBtn = page.locator('button[title="Flip Back"]');
  await expect(backFlipBtn).toBeVisible();
  await expect(backFlipBtn).toHaveAttribute('aria-label', 'Rotate Back 180 degrees');
});
