import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

test.describe.configure({ mode: 'serial' });

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for grid dos test...');
  server = spawn('pnpm', ['dev', '--port', '3003'], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    try { process.kill(-server.pid); } catch (e) {}
  }
});

test('Should clamp grid rows and columns to prevent DoS', async ({ page }) => {
  await page.goto('http://localhost:3003');

  const rowsInput = page.locator('#grid-rows');
  const colsInput = page.locator('#grid-cols');

  // Attempt to bypass HTML min/max constraints by setting large values
  await rowsInput.evaluate((node) => {
    node.value = '1000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await colsInput.evaluate((node) => {
    node.value = '1000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for debounce and DOM updates
  await page.waitForTimeout(1000);

  // Assert that values were clamped and synced back to UI
  await expect(rowsInput).toHaveValue('10');
  await expect(colsInput).toHaveValue('10');

  // Verify number of DOM elements created is bounded
  const pageCells = await page.locator('.page-cell').count();
  // Depending on logic, it should be clamped (e.g., 10x10 = 100, plus unused bucket)
  // Just ensure it's nowhere near 1000 * 1000
  expect(pageCells).toBeLessThan(500);
});
