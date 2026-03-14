import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

let server;

// Need serial mode to avoid port conflict from fullyParallel setting globally
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
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

test('Grid row and column inputs should be strictly clamped in JS to prevent client-side DoS', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3004/');

  // Wait for the app to initialize
  await page.waitForSelector('#grid-rows');

  // Set the inputs to values much larger than the HTML constraints directly via property
  // which mimics bypassing HTML min/max constraints
  await page.evaluate(() => {
    const rowsInput = document.getElementById('grid-rows');
    const colsInput = document.getElementById('grid-cols');

    // Set bypass values directly
    rowsInput.value = '1000';
    colsInput.value = '1000';

    // Dispatch input event to trigger our custom handler
    rowsInput.dispatchEvent(new Event('input', { bubbles: true }));
    colsInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Wait for the debounce to finish (300ms)
  await page.waitForTimeout(500);

  // Assert that values were clamped back to 10
  const clampedRows = await page.locator('#grid-rows').inputValue();
  const clampedCols = await page.locator('#grid-cols').inputValue();

  expect(clampedRows).toBe('10');
  expect(clampedCols).toBe('10');

  // Verify the calculated total also maxes out appropriately
  const gridTotal = await page.locator('#grid-total').innerText();
  expect(gridTotal).toBe('(100 pages)');
});
