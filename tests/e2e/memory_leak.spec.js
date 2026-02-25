
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Performance: Memory Leak', () => {
  test.beforeAll(() => {
    try {
        execSync('node scripts/create_1_page_pdf.js');
    } catch (e) {
        console.error('Failed to create test PDF:', e);
    }
  });

  test('should revoke old Blob URLs when uploading a new PDF', async ({ page }) => {
    // 1. Inject spy script
    await page.addInitScript(() => {
        window.revokedUrls = [];
        const originalRevoke = URL.revokeObjectURL;
        URL.revokeObjectURL = (url) => {
            window.revokedUrls.push(url);
            originalRevoke(url);
        };
        // Also spy create to know what was created
        window.createdUrls = [];
        const originalCreate = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
            const url = originalCreate(blob);
            window.createdUrls.push(url);
            return url;
        };
    });

    // 2. Load app
    await page.goto('/');

    // 3. Upload PDF 1
    const fileInput = page.locator('input[type="file"]');
    await fileInput.waitFor({ state: 'attached' });
    await fileInput.setInputFiles('test-1-page.pdf');

    // 4. Wait for processing 1
    // Wait for at least 2 URLs created (File + Page 1)
    await page.waitForFunction(() => window.createdUrls && window.createdUrls.length >= 2, { timeout: 30000 });
    // Also wait for UI to settle
    await expect(page.locator('.toast-success').filter({ hasText: 'Done!' })).toBeVisible({ timeout: 30000 });

    // Get URLs created in pass 1
    const pass1Urls = await page.evaluate(() => [...window.createdUrls]);
    console.log('Pass 1 URLs:', pass1Urls);
    const pass1Count = pass1Urls.length;

    // 5. Upload PDF 2
    await fileInput.setInputFiles([]);
    await fileInput.setInputFiles('test-1-page.pdf');

    // 6. Wait for processing 2
    // Wait for new URLs to be created. We expect at least 2 more.
    await page.waitForFunction((initialCount) => window.createdUrls.length >= initialCount + 2, pass1Count, { timeout: 30000 });

    // Wait a bit more for cleanup to potentially happen (it should happen at start of processing though)
    await page.waitForTimeout(1000);

    // 7. Check if pass 1 URLs were revoked
    const revoked = await page.evaluate(() => window.revokedUrls);
    console.log('Revoked URLs:', revoked);

    const leaked = pass1Urls.filter(url => !revoked.includes(url));
    console.log('Leaked URLs (not revoked):', leaked);

    // Assert that we have revoked at least something from pass 1
    const intersection = pass1Urls.filter(url => revoked.includes(url));

    // This expectation should FAIL currently
    expect(intersection.length, 'Should revoke old URLs').toBeGreaterThan(0);
  });
});
