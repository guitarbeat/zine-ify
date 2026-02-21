import { test, expect } from '@playwright/test';

test('Verify Flip Button Accessibility Labels', async ({ page }) => {
  await page.goto('/');

  // Wait for the grid to render
  const firstFlipBtn = page.locator('.page-cell[data-page="1"] .flip-btn');
  await expect(firstFlipBtn).toBeVisible();

  // Check the aria-label of the first flip button
  const ariaLabel = await firstFlipBtn.getAttribute('aria-label');
  const title = await firstFlipBtn.getAttribute('title');

  console.log(`Flip Button 1 ARIA Label: "${ariaLabel}"`);
  console.log(`Flip Button 1 Title: "${title}"`);

  // Assertions
  expect(ariaLabel).toContain('Page 1');
  expect(title).toContain('Page 1');

  // Verify second page as well
  const secondFlipBtn = page.locator('.page-cell[data-page="2"] .flip-btn');
  const ariaLabel2 = await secondFlipBtn.getAttribute('aria-label');
  const title2 = await secondFlipBtn.getAttribute('title');

  console.log(`Flip Button 2 ARIA Label: "${ariaLabel2}"`);
  console.log(`Flip Button 2 Title: "${title2}"`);

  expect(ariaLabel2).toContain('Page 2');
  expect(title2).toContain('Page 2');
});
