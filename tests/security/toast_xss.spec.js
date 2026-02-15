import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  // Start the vite dev server on port 3000
  // Use 'exec' or 'spawn' with shell: true for pnpm
  // We use a different port to avoid conflicts
  console.log('Starting dev server...');
  server = spawn('pnpm', ['dev', '--port', '3000'], {
    stdio: 'ignore', // Ignore output to keep test logs clean
    shell: true,
    detached: true // Allow killing the process group
  });

  // Wait for server to be ready
  // A simple delay is usually enough for Vite
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

test('Toast should prevent XSS by escaping HTML content', async ({ page }) => {
  // Navigate to our test page served by Vite
  // The root is served at /, so tests/security/test-toast.html should be accessible
  await page.goto('http://localhost:3000/tests/security/test-toast.html');

  // Wait for the toast module to load and expose window.toast
  await page.waitForFunction(() => window.toast);

  // Trigger a toast with HTML payload in the message
  await page.evaluate(() => {
    window.toast.show('info', 'XSS Title', 'This is <b>bold</b> text');
  });

  // Check if the bold tag is rendered in the DOM
  // If vulnerable, the <b> tag will exist and be visible.
  // If secure, the text "<b>bold</b>" will be rendered as text, so no <b> element.
  const boldTag = page.locator('.toast-message b');

  // Assert that NO bold tag exists
  await expect(boldTag).not.toBeVisible();

  // Trigger a toast with HTML payload in the title
  await page.evaluate(() => {
    window.toast.show('error', '<b>XSS Title</b>', 'Message');
  });

  const boldTitle = page.locator('.toast-title b');
  await expect(boldTitle).not.toBeVisible();
});
