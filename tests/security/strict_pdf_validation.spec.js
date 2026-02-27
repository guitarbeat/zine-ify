import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

// Use serial mode to avoid port conflicts if running in parallel
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  console.log('Starting dev server for strict file validation test...');
  // Use a different port (3002) to avoid conflicts
  server = spawn('pnpm', ['dev', '--port', '3002'], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    try { process.kill(-server.pid); } catch (e) {}
  }
});

test('Should reject files where PDF signature is not at the start', async ({ page }) => {
  await page.goto('http://localhost:3002');

  // Create a file with leading garbage before PDF header
  // Currently (with includes), this might be accepted. We want to reject it.
  const buffer = Buffer.from('   %PDF-1.7\n%This is not at start');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'offset_header.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  const toastMessage = page.locator('#toast-container');

  // We expect strict validation to reject this
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});
