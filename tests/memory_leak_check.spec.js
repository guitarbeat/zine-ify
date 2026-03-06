import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';
import fs from 'fs';

const testPdfPath = 'test-leak.pdf';

test.beforeAll(() => {
    const doc = new jsPDF();
    doc.text('Test Page', 10, 10);
    // Add 8 pages to ensure we have enough content to fill a grid if needed
    for(let i=1; i<8; i++) {
        doc.addPage();
        doc.text(`Page ${i+1}`, 10, 10);
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
  await expect(page.getByText('Successfully processed')).toBeVisible();

  // Get the blob URL of page 1
  const page1Img = page.locator('.page-cell[data-page-index="0"] .page-content-img');
  const src1 = await page1Img.getAttribute('src');
  console.log(`Page 1 src: ${src1}`);

  // 2. Upload PDF again to trigger reprocessing
  // Reset input value to allow re-selecting same file
  await page.evaluate(() => {
    const input = document.querySelector('input[type="file"]');
    if (input) input.value = '';
  });

  await fileInput.setInputFiles(testPdfPath);

  // Wait for success message (wait for it to disappear and reappear, or just wait for last one)
  // We can just wait for the progress bar to show up then hide
  await expect(page.locator('#progress-container')).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.locator('#progress-container')).toBeHidden();

  // Check if src1 was revoked
  const wasRevoked = revokedUrls.includes(src1);
  console.log(`Was ${src1} revoked? ${wasRevoked}`);

  expect(wasRevoked).toBe(true);
});
