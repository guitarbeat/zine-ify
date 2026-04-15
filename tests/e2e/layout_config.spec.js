import { test, expect } from '@playwright/test';

async function getSheetBounds(page) {
  return page.locator('.print-sheet').first().evaluate((element) => {
    const { width, height } = element.getBoundingClientRect();
    return { width, height, ratio: width / height };
  });
}

test('layout view stays synced with paper config changes', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#paper-size-select')).toHaveValue('letter');
  await expect(page.locator('#orientation-select')).toHaveValue('landscape');
  await expect(page.locator('#preview-helper-chip')).toContainText('Letter');
  await expect(page.locator('#preview-helper-chip')).toContainText('Landscape');

  const landscapeBounds = await getSheetBounds(page);
  expect(landscapeBounds.ratio).toBeGreaterThan(1);

  await page.locator('#orientation-select').selectOption('portrait');
  await expect(page.locator('#preview-helper-chip')).toContainText('Portrait');

  const portraitBounds = await getSheetBounds(page);
  expect(portraitBounds.ratio).toBeLessThan(1);
  expect(portraitBounds.height).toBeGreaterThan(landscapeBounds.height);

  await page.locator('#paper-size-select').selectOption('legal');
  await expect(page.locator('#preview-helper-chip')).toContainText('Legal');

  const legalPortraitBounds = await getSheetBounds(page);
  expect(legalPortraitBounds.height).toBeGreaterThan(portraitBounds.height);
});
