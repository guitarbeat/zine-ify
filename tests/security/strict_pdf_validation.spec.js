import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

let server;

test.beforeAll(async () => {
  console.log('Starting dev server for strict file validation test...');
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

test('Should reject files where PDF signature is not at the start (Polyglot protection)', async ({ page }) => {
  await page.goto('http://localhost:3002');

  // Create a file with PDF signature NOT at the start
  const buffer = Buffer.from('GARBAGE_DATA\n%PDF-1.7\n%Rest of file');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'polyglot_attempt.pdf',
    mimeType: 'application/pdf',
    buffer: buffer
  });

  const toastMessage = page.locator('#toast-container');
  // Currently, the app uses 'includes', so this MIGHT pass (no error about signature).
  // But we want it to FAIL (show error about signature).
  // So for this test to pass AFTER the fix, we expect "Invalid file signature".
  // To confirm it fails BEFORE the fix, we can expect it NOT to show "Invalid file signature".

  // For the purpose of TDD, I will write the assertion that reflects the DESIRED state (Reject).
  // So this test should FAIL initially.
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});
