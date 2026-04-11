import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

function createPdfBuffer(label) {
  const doc = new jsPDF();
  doc.text(label, 10, 10);
  return Buffer.from(doc.output('arraybuffer'));
}

test('queues multiple uploaded PDFs instead of rejecting concurrent work', async ({ page }) => {
  await page.goto('/');

  const fileInput = page.locator('#pdf-upload');
  await fileInput.setInputFiles([
    {
      name: 'queue-a.pdf',
      mimeType: 'application/pdf',
      buffer: createPdfBuffer('A')
    },
    {
      name: 'queue-b.pdf',
      mimeType: 'application/pdf',
      buffer: createPdfBuffer('B')
    }
  ]);

  await expect(page.locator('#uploaded-files-list .uploaded-file-item')).toHaveCount(2);
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('.page-cell .page-content-img'));
    return images.filter((img) => /^blob:/.test(img.getAttribute('src') || '')).length >= 2;
  }, { timeout: 30000 });
  await expect(page.locator('#toast-container')).not.toContainText('PDF processing already in progress');
});
