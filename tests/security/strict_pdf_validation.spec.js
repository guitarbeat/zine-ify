import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

// Configure serial mode to avoid port conflicts
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // eslint-disable-next-line no-console
  console.log('Starting dev server for strict file validation test...');
  // Use a different port (3002) to avoid conflicts
  server = spawn('pnpm', ['dev', '--port', '3002'], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    try { process.kill(-server.pid); } catch { /* ignore */ }
  }
});

test('Should strictly reject files where PDF signature is not at the start', async ({ page }) => {
  await page.goto('http://localhost:3002');

  // Create a polyglot-like file (valid PDF signature but not at offset 0)
  const buffer = Buffer.from('JUNK%PDF-1.7\n%This is a polyglot attempt\n');

  // Get the file input
  const fileInput = page.locator('#pdf-upload');

  // Upload the invalid file
  await fileInput.setInputFiles({
    name: 'polyglot.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  // Check for the specific error message in the toast
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});

test('Should accept valid PDF files', async ({ page }) => {
  await page.goto('http://localhost:3002');

  // Create a valid PDF file
  const buffer = Buffer.from('%PDF-1.7\n%This is a valid PDF header\n');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'valid.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  const toastMessage = page.locator('#toast-container');

  // We expect it NOT to say "Invalid file signature"
  await expect(toastMessage).not.toContainText('Invalid file signature');
});
