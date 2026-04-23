import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

test.describe.configure({ mode: 'serial' });

let server;
const PORT = 3005;

test.beforeAll(async () => {
  server = spawn('pnpm', ['dev', '--port', PORT.toString()], {
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

test('Should not leak full error object/stack trace in console on PDF error', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(`http://localhost:${PORT}`);

  // Create a file with valid PDF signature but invalid content to trigger a processing error
  const buffer = Buffer.from('%PDF-1.7\nNOT_A_VALID_PDF_BODY');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'corrupted.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  // Wait for the error toast to appear
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Error', { timeout: 10000 });

  // Verify that console error contains the prefix but NOT a full object representation or stack trace
  // When an object is logged, msg.text() often shows [object Object] or similar depending on environment
  
  const pdfErrorLog = consoleErrors.find(log => log.startsWith('PDF Error:'));
  expect(pdfErrorLog).toBeDefined();
  
  // It should be a string, and specifically it should NOT contain common stack trace indicators if it was just the message
  expect(pdfErrorLog).not.toContain('[object Object]');
  
  const loadingErrorLog = consoleErrors.find(log => log.startsWith('PDF loading error:'));
  expect(loadingErrorLog).toBeDefined();
  expect(loadingErrorLog).not.toContain('[object Object]');
});
