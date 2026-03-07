import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

let server;

test.beforeAll(async () => {
  server = spawn('pnpm', ['dev', '--port', '3000'], {
    stdio: 'ignore',
    shell: true,
    detached: true
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
});

test.afterAll(() => {
  if (server) {
    try {
      process.kill(-server.pid);
    } catch (e) {}
  }
});

test('File names in uploaded list should be sanitized to prevent XSS', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000/');

  // Wait for the upload input to exist
  const uploadInput = page.locator('#pdf-upload');

  // Create a dummy PDF with an XSS payload in the name
  // Note: using a slightly safer name that won't break file systems but is valid HTML injection
  const payloadName = 'test-<img src=x onerror=window.xssInjected=true>.pdf';

  // Create an empty file with the payload name
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, payloadName);
  fs.writeFileSync(filePath, '%PDF-1.4\nEOF');

  // Upload the file
  await uploadInput.setInputFiles(filePath);

  // Wait for the file to show up in the list
  await page.waitForSelector('.uploaded-file-item');

  // Check if our script executed
  const isXssInjected = await page.evaluate(() => window.xssInjected);

  // Clean up
  try {
    fs.unlinkSync(filePath);
  } catch (e) {}

  // Assert that XSS did NOT execute
  expect(isXssInjected).toBeUndefined();

  // Assert that the filename is visible as text
  const fileText = await page.locator('.uploaded-file-item').innerText();
  expect(fileText).toContain('test-<img src=x onerror=window.xssInjected=true>.pdf');
});
