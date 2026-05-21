import { test, expect } from '@playwright/test';

test('Should reject polyglot files (PDF signature not at offset 0)', async ({ page }) => {
  await page.goto('/');

  // Create a polyglot file: 10 bytes of garbage, then the PDF header
  const garbage = 'JAVASCRIPT';
  const pdfContent = '%PDF-1.7\n%Fake content';
  const buffer = Buffer.concat([
    Buffer.from(garbage),
    Buffer.from(pdfContent)
  ]);

  const fileInput = page.locator('#pdf-upload');

  // Upload the polyglot file
  await fileInput.setInputFiles({
    name: 'polyglot.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  // Check for the specific error message in the toast
  // If the app correctly validates the signature, this toast should appear.
  // If the app fails to validate the signature, the app accepts it (and maybe fails later with a parsing error),
  // so we won't see "Invalid file signature".
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});
