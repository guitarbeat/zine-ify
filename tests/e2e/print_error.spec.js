import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

function createPdfBuffer(label) {
  const doc = new jsPDF();
  doc.text(label, 10, 10);
  return Buffer.from(doc.output('arraybuffer'));
}

test('handlePrint error handling displays toast error', async ({ page }) => {
  await page.goto('/');

  // 1. Upload a PDF so that there's content to print
  const fileInput = page.locator('#pdf-upload');
  await fileInput.setInputFiles({
    name: 'test.pdf',
    mimeType: 'application/pdf',
    buffer: createPdfBuffer('Test')
  });

  // Wait for processing
  await expect(page.locator('#upload-status')).toContainText('Imported 1 of 1 pages', { timeout: 10000 });

  // 2. Mock exportService.handlePrint to reject
  await page.evaluate(() => {
    window.app.exportService.handlePrint = function() {
      return Promise.reject(new Error('Simulated print error'));
    };
  });

  // 3. Trigger print
  const printBtn = page.locator('#printBtn');
  await printBtn.click();

  // 4. Check for toast error
  const toast = page.locator('.toast.toast-error');
  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toContainText('Print Failed');
  await expect(toast).toContainText('Simulated print error');
});
