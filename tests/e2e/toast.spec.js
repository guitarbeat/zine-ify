import { test, expect } from '@playwright/test';

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

    // We expect "Error" as title.
    await expect(toast).toContainText('Error');
    // We expect the specific error message
    await expect(toast).toContainText('PDF processing failed: Please select a PDF file');
  } finally {
    // No cleanup needed
  }
});
