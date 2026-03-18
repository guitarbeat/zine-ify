import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Use unique port 3004 for the test server to avoid conflicts
  server = spawn('pnpm', ['dev', '--port', '3004'], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    try {
      process.kill(-server.pid);
    } catch (e) {}
  }
});

test('Should clamp grid row and column values to prevent DoS', async ({ page }) => {
  await page.goto('http://localhost:3004/');

  const rowsInput = page.locator('#grid-rows');
  const colsInput = page.locator('#grid-cols');

  // Verify elements are visible
  await expect(rowsInput).toBeVisible();
  await expect(colsInput).toBeVisible();

  // Test rows input DoS value (HTML max is 10)
  await rowsInput.evaluate(node => {
    node.value = '1000000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Test cols input DoS value
  await colsInput.evaluate(node => {
    node.value = '1000000';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for debounce (300ms)
  await page.waitForTimeout(500);

  // Check that values are clamped back to 10
  const rowsVal = await rowsInput.inputValue();
  const colsVal = await colsInput.inputValue();

  expect(rowsVal).toBe('10');
  expect(colsVal).toBe('10');

  // Check negative clamping as well
  await rowsInput.evaluate(node => {
    node.value = '-100';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await colsInput.evaluate(node => {
    node.value = '-100';
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await page.waitForTimeout(500);

  const rowsValNeg = await rowsInput.inputValue();
  const colsValNeg = await colsInput.inputValue();

  expect(rowsValNeg).toBe('1');
  expect(colsValNeg).toBe('1');
});
