
import { test, expect } from '@playwright/test';
import path from 'path';

test('automate 16-page zine conversion', async ({ page }) => {
    // 1. Go to app
    console.log('Navigating to app...');
    await page.goto('http://localhost:8000');

    // 2. Prepare file upload
    console.log('Uploading PDF...');
    const fileInput = page.locator('#pdf-upload');
    await fileInput.setInputFiles('aaron-made-me-do-this 2.pdf');

    // 3. Wait for processing to finish
    // We look for the progress container to disappear OR the success toast
    console.log('Waiting for processing...');
    await expect(page.locator('#progress-container')).toBeHidden({ timeout: 30000 });
    await expect(page.locator('.toast-success').filter({ hasText: 'Done!' })).toBeVisible({ timeout: 10000 });

    // Verify 16 pages/ 2 zines detected
    // Check if tabs exist
    const tab2 = page.locator('#zine-tab-2');
    if (await tab2.isVisible()) {
        console.log('Detected 16-page zine (tabs visible).');
    } else {
        console.log('Detected single zine.');
    }

    // 4. Click Export
    console.log('Clicking Export...');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportPdfBtn').click();

    // 5. Wait for download
    const download = await downloadPromise;
    console.log(`Download started: ${download.suggestedFilename()}`);

    // 6. Save to project root
    const outputPath = path.resolve('zine-output.pdf');
    await download.saveAs(outputPath);
    console.log(`Saved zine to: ${outputPath}`);
});
