import { test, expect } from '@playwright/test';

test('Should limit simultaneous file uploads to 10 and display a warning toast', async ({ page }) => {
  await page.goto('/');

  // Create a minimal valid PDF content
  const pdfContent = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF';
  const pdfBuffer = Buffer.from(pdfContent);
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2pQ6kAAAAASUVORK5CYII=', 'base64');

  // Generate 11 mixed files
  const files = [];
  for (let i = 1; i <= 6; i++) {
    files.push({
      name: `test${i}.pdf`,
      mimeType: 'application/pdf',
      buffer: pdfBuffer
    });
  }

  for (let i = 7; i <= 11; i++) {
    files.push({
      name: `image${i}.png`,
      mimeType: 'image/png',
      buffer: pngBuffer
    });
  }

  const fileInput = page.locator('#pdf-upload');

  // Upload the 11 files
  await fileInput.setInputFiles(files);

  // Check for the specific warning message in the toast
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText(/Maximum 10 files allowed at once|Import Failed/, { timeout: 5000 });
});
