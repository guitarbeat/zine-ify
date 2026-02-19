
import { test, expect } from '@playwright/test';

test('should reject file with invalid signature', async ({ page }) => {
  await page.goto('/');

  // Create a fake PDF file (text content, but .pdf extension and mime type)
  const fakePdf = {
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('This is just a text file, not a real PDF.')
  };

  // Listen for console logs to debug
  page.on('console', msg => console.log('Console:', msg.text()));

  // Trigger file upload
  await page.setInputFiles('#pdf-upload', fakePdf);

  // Expect an error toast or status message
  // Currently: "The PDF file appears to be corrupted or invalid."
  // Desired: "Invalid file signature. The file does not appear to be a valid PDF."

  // We can check the toast message
  const toast = page.locator('#toast-container .toast-error');
  await expect(toast).toBeVisible({ timeout: 10000 });

  const errorText = await toast.textContent();
  console.log('Error message found:', errorText);

  // Assert specific error message
  expect(errorText).toContain('Invalid file signature');
});
