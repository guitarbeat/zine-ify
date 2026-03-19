import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

test.describe.configure({ mode: 'serial' });

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for grid dos test...');
  server = spawn('pnpm', ['dev', '--port', '3002'], {
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

test('Grid inputs should be clamped to prevent massive DOM creation DoS', async ({ page }) => {
  await page.goto('http://localhost:3002');

  const rowsInput = page.locator('#grid-rows');
  const colsInput = page.locator('#grid-cols');

  // Use evaluate to bypass HTML min/max constraints and dispatch input event
  await rowsInput.evaluate(node => {
    node.value = '10000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await colsInput.evaluate(node => {
    node.value = '10000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for debounce timeout
  await page.waitForTimeout(500);

  // Assert that values were clamped back to 10
  await expect(rowsInput).toHaveValue('10');
  await expect(colsInput).toHaveValue('10');

  // Check the DOM to make sure we didn't create 100,000,000 elements
  // We should have exactly 10x10 = 100 cells, or 8 from the default grid layout that might still exist if grid didn't get recreated.
  // The crucial part is it's NOT 100,000,000 (which would crash). Wait for elements if it did recreate it.
  // The actual cell count might be different based on the unused grid bucket mechanism in zine-ui.js,
  // but it should definitely be a reasonable number (<= 100).
  const cellCount = await page.locator('.page-cell').count();
  expect(cellCount).toBeLessThanOrEqual(100);
});
