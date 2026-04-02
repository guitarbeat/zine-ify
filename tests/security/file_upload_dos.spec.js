import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for file upload DoS test...');
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

test('Should limit simultaneous file uploads to 10 and display a warning toast', async ({ page }) => {
  await page.goto('http://localhost:3003');

  // Create a minimal valid PDF content
  const pdfContent = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF';
  const buffer = Buffer.from(pdfContent);

  // Generate 11 files
  const files = [];
  for (let i = 1; i <= 11; i++) {
    files.push({
      name: `test${i}.pdf`,
      mimeType: 'application/pdf',
      buffer: buffer
    });
  }

  const fileInput = page.locator('#pdf-upload');

  // Upload the 11 files
  await fileInput.setInputFiles(files);

  // Check for the specific warning message in the toast
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Maximum 10 files allowed at once', { timeout: 5000 });
});