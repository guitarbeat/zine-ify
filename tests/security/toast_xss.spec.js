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

test('Toast should allow safe HTML but sanitize XSS', async ({ page }) => {
  // Navigate to our test page served by Vite
  await page.goto('http://localhost:3000/tests/security/test-toast.html');
  await page.waitForFunction(() => window.toast);

  // 1. Check Safe HTML (Bold)
  await page.evaluate(() => {
    window.toast.show('info', 'Safe Title', 'This is <b>bold</b> text');
  });

  // Expect <b> tag to be present and visible (Safe HTML allowed)
  const boldTag = page.locator('.toast-message b');
  await expect(boldTag).toBeVisible();
  await expect(boldTag).toHaveText('bold');

  // 2. Check XSS (Script)
  await page.evaluate(() => {
    window.toast.show('error', 'XSS Attempt', 'Bad <script>window.xssInjected = true</script>');
  });

  // Script tag should be removed or sanitized
  const scriptTag = page.locator('.toast-message script');
  await expect(scriptTag).not.toBeAttached();

  // Ensure the script didn't execute
  const xssInjected = await page.evaluate(() => window.xssInjected);
  expect(xssInjected).toBeUndefined();

  // 3. Check XSS (Event Handler)
  await page.evaluate(() => {
    window.toast.show('warning', 'Attr XSS', '<img src=x onerror=alert(1)>');
  });

  // Img tag should be removed (not in whitelist) or attribute removed
  const imgTag = page.locator('.toast-message img');
  await expect(imgTag).not.toBeAttached();
});
