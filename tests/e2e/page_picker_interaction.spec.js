import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

function createPdfBuffer(pageCount = 10) {
  const doc = new jsPDF();

  for (let index = 1; index <= pageCount; index++) {
    if (index > 1) {
      doc.addPage();
    }

    doc.setFontSize(28);
    doc.text(`Page ${index}`, 20, 40);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

test('page picker confirm imports the default selection and hides progress overlay', async ({ page }) => {
  await page.goto('/');

  await page.locator('#pdf-upload').setInputFiles({
    name: 'confirm-picker.pdf',
    mimeType: 'application/pdf',
    buffer: createPdfBuffer()
  });

  await expect(page.locator('#page-picker-modal')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#progress-container')).toBeHidden();
  await expect(page.locator('#page-picker-count')).toContainText('8 of 8 selected');
  await expect(page.locator('.page-picker-thumb.is-selected')).toHaveCount(8);

  await page.locator('#page-picker-confirm').click();

  await expect(page.locator('#upload-status')).toContainText('Imported 8 of 10 pages from confirm-picker.pdf', {
    timeout: 30000
  });
  await expect(page.locator('#page-picker-modal')).toBeHidden();
  await expect(page.locator('.page-cell.has-page')).toHaveCount(8);
});

test('page picker cancel skips oversized PDF import', async ({ page }) => {
  await page.goto('/');

  await page.locator('#pdf-upload').setInputFiles({
    name: 'cancel-picker.pdf',
    mimeType: 'application/pdf',
    buffer: createPdfBuffer()
  });

  await expect(page.locator('#page-picker-modal')).toBeVisible({ timeout: 30000 });
  await page.locator('#page-picker-cancel').click();

  await expect(page.locator('#upload-status')).toContainText('Skipped: cancel-picker.pdf', {
    timeout: 30000
  });
  await expect(page.locator('#page-picker-modal')).toBeHidden();
  await expect(page.locator('.page-cell.has-page')).toHaveCount(0);
});
