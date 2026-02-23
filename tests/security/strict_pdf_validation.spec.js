import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for strict pdf validation test...');
  server = spawn('pnpm', ['dev', '--port', '3002'], {
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

test('Should reject polyglot files (PDF signature not at offset 0)', async ({ page }) => {
  await page.goto('http://localhost:3002');

  // Create a polyglot file: 10 bytes of garbage, then the PDF header
  const garbage = 'JAVASCRIPT';
  const pdfContent = '%PDF-1.7\n%Fake content';
  const buffer = Buffer.concat([
    Buffer.from(garbage),
    Buffer.from(pdfContent)
  ]);

  const fileInput = page.locator('#pdf-upload');

  // Upload the polyglot file
  await fileInput.setInputFiles({
    name: 'polyglot.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  // Check for the specific error message in the toast
  // If the vulnerability is fixed, this toast should appear.
  // If the vulnerability exists, the app accepts it (and maybe fails later with a parsing error),
  // so we won't see "Invalid file signature".
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});
