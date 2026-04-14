import { test, expect } from '@playwright/test';

test.describe('Grid DoS Protection', () => {
  test('should clamp large grid inputs to prevent massive DOM node generation (client-side DoS)', async ({ page }) => {
    await page.goto('/');

    // Verify UI is loaded
    await expect(page.locator('#grid-rows')).toBeVisible();

    // Directly set huge values using JS (bypassing HTML min/max constraints)
    await page.locator('#grid-rows').evaluate(node => node.value = '1000');
    await page.locator('#grid-cols').evaluate(node => node.value = '1000');

    // Dispatch input events
    await page.locator('#grid-rows').dispatchEvent('input');
    await page.locator('#grid-cols').dispatchEvent('input');

    // Wait for debounce (300ms)
    await page.waitForTimeout(500);

    // Assert the input values are clamped back to max 10
    const rowsValue = await page.locator('#grid-rows').inputValue();
    const colsValue = await page.locator('#grid-cols').inputValue();

    expect(rowsValue).toBe('10');
    expect(colsValue).toBe('10');

    // Generate a layout - simulating the grid total pages update and layout rendering
    // Let's assert that the grid total text shows at most 100 slots
    const gridTotalText = await page.locator('#grid-total').textContent();
    expect(gridTotalText).toContain('100 slots');
  });
});
