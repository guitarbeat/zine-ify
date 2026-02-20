import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for file validation test...');
  // Use a different port (3001) to avoid conflicts if the other test is running or leftover
  server = spawn('pnpm', ['dev', '--port', '3001'], {
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

test('Should reject files without PDF signature', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Create a dummy non-PDF file
  const buffer = Buffer.from('This is not a PDF file. It is just text.');

  // Get the file input
  const fileInput = page.locator('#pdf-upload');

  // Upload the invalid file
  await fileInput.setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  // Check for the specific error message in the toast
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});

test('Should accept files with valid PDF signature (even if corrupted later)', async ({ page }) => {
  await page.goto('http://localhost:3001');

  // Create a file with valid PDF header
  const buffer = Buffer.from('%PDF-1.7\n%This is a valid header\nBut the rest is garbage.');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'valid_header.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  const toastMessage = page.locator('#toast-container');

  // Wait for ANY toast message
  await expect(toastMessage).toBeVisible();

  // It should NOT be the signature error
  await expect(toastMessage).not.toContainText('Invalid file signature');

  // It will likely be a PDF parsing error
  // checking that we proceed past the signature check
});
