
import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for UX verification...');
  server = spawn('pnpm', ['dev', '--port', '3001'], {
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
    } catch (e) {
      // Ignore
    }
  }
});

test('Verify UX improvements', async ({ page }) => {
  // 1. Load the app
  await page.goto('http://localhost:3001');

  // 2. Wait for UI to generate
  await page.waitForSelector('.page-cell', { timeout: 10000 });

  // 3. Check Flip Button
  const flipBtn = page.locator('.flip-btn').first();
  await expect(flipBtn).toBeVisible();

  // Check for Aria Label
  const ariaLabel = await flipBtn.getAttribute('aria-label');
  expect(ariaLabel).toBe('Rotate page 180 degrees');

  // Check for Focus Styles
  const classes = await flipBtn.getAttribute('class');
  expect(classes).toContain('focus-visible:ring-2');
  expect(classes).toContain('focus-visible:ring-black');
  expect(classes).toContain('focus-visible:outline-none');

  // 4. Check Image Transition
  const img = page.locator('.page-content-img').first();
  const imgClasses = await img.getAttribute('class');
  expect(imgClasses).toContain('transition-transform');
  expect(imgClasses).toContain('duration-300');
  expect(imgClasses).toContain('ease-in-out');

  console.log('UX Verification Passed!');
});
