import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {

  test('Ctrl+O triggers file upload', async ({ page }) => {
    await page.goto('/');

    // Listen for file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Press Ctrl+O (or Meta+O on macOS, but Control usually works cross-platform in Playwright if not specified as 'Meta')
    // To be safe, we can try both or detect OS. Playwright's 'Control+o' sends Control key.
    // The app checks for (e.metaKey || e.ctrlKey).
    await page.keyboard.press('Control+o');

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('Ctrl+S triggers export (with content)', async ({ page }) => {
    await page.goto('/');

    // 1. Upload a dummy PDF first to have content
    // Minimal valid PDF structure
    const minimalPdf = Buffer.from(
      '%PDF-1.7\n' +
      '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
      '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
      '3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\n' +
      'xref\n' +
      '0 4\n' +
      '0000000000 65535 f\n' +
      '0000000010 00000 n\n' +
      '0000000060 00000 n\n' +
      '0000000111 00000 n\n' +
      'trailer<</Size 4/Root 1 0 R>>\n' +
      'startxref\n' +
      '190\n' +
      '%%EOF\n'
    );

    // Initial state: ensure no toast
    await expect(page.locator('#toast-container')).toBeEmpty();

    await page.locator('#pdf-upload').setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: minimalPdf
    });

    // Wait for processing to finish. The app shows "Done!" title and "Your zine is ready to print." message.
    // We look for the message part.
    await expect(page.getByText('Your zine is ready to print.')).toBeVisible({ timeout: 20000 });

    // 2. Press Ctrl+S
    await page.keyboard.press('Control+s');

    // Check for the "Generating PDF..." toast
    await expect(page.getByText('Generating PDF...')).toBeVisible();

    // Check that the export button becomes disabled during export
    await expect(page.locator('#exportPdfBtn')).toBeDisabled();
  });

});
