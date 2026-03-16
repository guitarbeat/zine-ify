import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('Should prevent DoS via massive grid dimensions', async ({ page }) => {
  await page.goto(`http://localhost:8001/`);

  // Wait for the inputs to be available
  await page.waitForSelector('#grid-rows');

  // Try to bypass HTML min/max constraints by directly setting values using evaluate
  await page.evaluate(() => {
    const rowsInput = document.getElementById('grid-rows');
    const colsInput = document.getElementById('grid-cols');

    rowsInput.value = 1000;
    colsInput.value = 1000;

    // Dispatch input events
    rowsInput.dispatchEvent(new Event('input', { bubbles: true }));
    colsInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for debounced event to trigger (300ms + some buffer)
  await page.waitForTimeout(1000);

  // Check the values were clamped in the UI
  const rowsValue = await page.$eval('#grid-rows', el => parseInt(el.value));
  const colsValue = await page.$eval('#grid-cols', el => parseInt(el.value));

  const cellCount = await page.evaluate(() => document.querySelectorAll('.page-cell').length);

  expect(rowsValue).toBeLessThanOrEqual(10);
  expect(colsValue).toBeLessThanOrEqual(10);
  expect(cellCount).toBeLessThanOrEqual(100);
});
