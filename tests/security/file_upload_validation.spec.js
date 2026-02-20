import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let server;
const PORT = 3001;
const FAKE_PDF_PATH = 'tests/security/fake.pdf';

test.beforeAll(async () => {
  // Create a fake PDF file (text file)
  if (!fs.existsSync('tests/security')) {
    fs.mkdirSync('tests/security');
  }
  fs.writeFileSync(FAKE_PDF_PATH, 'This is not a PDF file. It is just text.');

  // Start the vite dev server on a unique port
  console.log('Starting dev server...');
  server = spawn('pnpm', ['dev', '--port', `${PORT}`], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  // Cleanup file
  if (fs.existsSync(FAKE_PDF_PATH)) {
    fs.unlinkSync(FAKE_PDF_PATH);
  }

  if (server) {
    try {
      process.kill(-server.pid);
    } catch (e) {
      // Ignore if already dead
    }
  }
});

test('Should reject fake PDF with invalid signature', async ({ page }) => {
  await page.goto(`http://localhost:${PORT}/`);

  // Wait for the upload zone to be ready
  const uploadZone = page.locator('#upload-zone');
  await expect(uploadZone).toBeVisible();

  // Upload the fake PDF
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(FAKE_PDF_PATH);

  // Wait for the error toast to appear (skip the initial info toast)
  // The error toast will have the class .toast-error
  const errorToast = page.locator('.toast-error');
  await errorToast.waitFor({ state: 'visible', timeout: 10000 });

  const errorTitle = await errorToast.locator('.toast-title').textContent();
  const errorMessage = await errorToast.locator('.toast-message').textContent();

  console.log(`Received error title: ${errorTitle}`);
  console.log(`Received error message: ${errorMessage}`);

  // Currently, without the fix, it likely says "Error" / "Failed to process PDF."
  // We expect it to eventually say something about "Missing PDF signature" after our fix.
  expect(errorMessage).toContain('Missing PDF signature');
});
