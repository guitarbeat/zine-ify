import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Start the vite dev server on port 3004
  console.log('Starting dev server for grid DoS test...');
  server = spawn('pnpm', ['dev', '--port', '3004'], {
    stdio: 'ignore', // Ignore output to keep test logs clean
    shell: true,
    detached: true // Allow killing the process group
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    // Kill the process group to ensure cleanup
    try {
      process.kill(-server.pid);
    } catch (e) {
      // Ignore if already dead
    }
  }
});

test('Grid inputs should enforce a maximum size to prevent DoS via massive DOM node creation', async ({ page }) => {
  await page.goto('http://localhost:3004/');

  // Wait for the inputs to be available
  const rowsInput = page.locator('#grid-rows');
  const colsInput = page.locator('#grid-cols');
  await rowsInput.waitFor({ state: 'attached' });
  await colsInput.waitFor({ state: 'attached' });

  // Directly set the values bypassing HTML min/max and trigger the event
  await page.evaluate(() => {
    const rInput = document.querySelector('#grid-rows');
    const cInput = document.querySelector('#grid-cols');
    rInput.value = 1000;
    cInput.value = 1000;
    rInput.dispatchEvent(new Event('input', { bubbles: true }));
    cInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for the debounced function to settle (300ms + margin)
  await page.waitForTimeout(500);

  // Verify that the JavaScript clamping fixed the values in the UI
  const updatedRows = await rowsInput.inputValue();
  const updatedCols = await colsInput.inputValue();
  expect(updatedRows).toBe('10');
  expect(updatedCols).toBe('10');

  // Verify that the actual DOM nodes created do not exceed the expected maximum (10x10=100)
  // Initially we have the 8 default cells or so, but let's just make sure it's not anywhere near 1000000
  const cells = await page.locator('.page-cell').count();
  expect(cells).toBeLessThanOrEqual(100);
});
