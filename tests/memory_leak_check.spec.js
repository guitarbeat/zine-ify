import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';
import fs from 'fs';

const testPdfPath = 'test-leak.pdf';

test.beforeAll(() => {
  const doc = new jsPDF();
  doc.text('Test Page', 10, 10);
  // Add 8 pages to ensure we have enough content to fill a grid if needed
  for (let i = 1; i < 8; i++) {
    doc.addPage();
    doc.text(`Page ${i + 1}`, 10, 10);
  }
  fs.writeFileSync(testPdfPath, Buffer.from(doc.output('arraybuffer')));
});

test.afterAll(() => {
  if (fs.existsSync(testPdfPath)) {
    fs.unlinkSync(testPdfPath);
  }
});

test('Verify memory leak fix', async ({ page }) => {
  const revokedUrls = [];

  // Spy on URL.revokeObjectURL
  await page.exposeFunction('onRevoke', (url) => {
    revokedUrls.push(url);
    console.log(`Reported revoke: ${url}`);
  });

  await page.addInitScript(() => {
    const oldRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (url) => {
      window.onRevoke(url);
      oldRevoke.call(URL, url);
    };
  });

  await page.goto('/');

  // 1. Upload PDF
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testPdfPath);

  // Wait for processing
  const progressContainer = page.locator('#progress-container');
  await expect(progressContainer).toBeHidden({ timeout: 15000 });

  // Get the blob URL of page 1
  const page1Img = page.locator('.page-cell[data-page-index="0"] .page-content-img');
  await expect(page1Img).toBeAttached();
  const src1 = await page1Img.getAttribute('src');
  console.log(`Page 1 src: ${src1}`);

  // 2. Click standard 'Remove' button to trigger revocation logic
  // Reveal the toolbar via hover
  await page.locator('.page-cell[data-page-index="0"]').hover();
  const removeBtn = page.locator('.page-cell[data-page-index="0"] .remove-btn');
  await removeBtn.click();

  // Wait for the UI to update (placeholder appears)
  await expect(page.locator('.page-cell[data-page-index="0"] .page-placeholder')).toBeVisible();

  // Check if src1 was revoked
  const wasRevoked = revokedUrls.includes(src1);
  console.log(`Was ${src1} revoked? ${wasRevoked}`);

  expect(wasRevoked).toBe(true);
});
