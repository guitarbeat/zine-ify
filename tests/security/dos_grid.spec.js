import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for dos grid test...');
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

test('Should clamp extreme grid layout dimensions to prevent DoS', async ({ page }) => {
  await page.goto('http://localhost:3003');

  // Input extreme values into grid rows and cols
  const rowsInput = page.locator('#grid-rows');
  const colsInput = page.locator('#grid-cols');

  // Evaluate directly to bypass HTML min/max constraints
  await rowsInput.evaluate(node => node.value = 1000);
  await colsInput.evaluate(node => node.value = 1000);

  // Trigger input event
  await rowsInput.dispatchEvent('input');

  // Wait for the grid to update
  await page.waitForTimeout(500);

  // Check the total pages text
  const gridTotal = page.locator('#grid-total');
  await expect(gridTotal).toContainText('(100 pages)');

  // Verify the number of generated cells
  // Wait a bit more just in case DOM needs time to render
  await page.waitForTimeout(500);

  const cells = await page.locator('.page-cell').count();

  // Total cells should be exactly 10x10 = 100
  expect(cells).toBe(100);
});
