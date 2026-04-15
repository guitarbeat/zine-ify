import { test, expect } from '@playwright/test';
import { SUPPORTED_UPLOAD_MESSAGE, UNSUPPORTED_UPLOAD_TITLE } from '../../src/utils/fileValidation.js';

test('Toast notification for invalid file upload', async ({ page }) => {
  // Navigate to the app. Using relative path if served via file://, but here we assume served via localhost
  // We need to know the base URL.
  // The existing test uses http://localhost:8000. I'll use that or / if baseURL is set.
  // I'll assume standard vite preview port 8000 as per package.json

  await page.goto('/');

  try {
    // Upload the invalid file using buffer (simulating file selection)
    const fileInput = page.locator('#pdf-upload');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is not a PDF')
    });

    // Verify toast appears with error class
    const toast = page.locator('.toast.toast-error');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // We expect the clearer workflow-specific error title.
    await expect(toast).toContainText(UNSUPPORTED_UPLOAD_TITLE);
    // We expect the specific error message
    await expect(toast).toContainText(SUPPORTED_UPLOAD_MESSAGE);
  } finally {
    // No cleanup needed
  }
});
