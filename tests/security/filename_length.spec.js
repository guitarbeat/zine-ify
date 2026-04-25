import { test, expect } from '@playwright/test';

test('Should reject files with excessively long names', async ({ page }) => {
  await page.goto('/');

  const longName = 'a'.repeat(260) + '.pdf';
  const pdfContent = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF';
  const buffer = Buffer.from(pdfContent);

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: longName,
    mimeType: 'application/pdf',
    buffer
  });

  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('File name is too long (maximum 255 characters)', { timeout: 5000 });
});
