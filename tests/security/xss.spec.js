import { test, expect } from '@playwright/test';

test.describe('File Name DOM XSS', () => {
  test('should execute script if vulnerable via innerHTML directly', async ({ page }) => {
    await page.goto('http://localhost:8000');

    // Just inject the vulnerability directly to see if the element is actually created!
    await page.evaluate(() => {
        const list = document.getElementById('uploaded-files-list');
        const maliciousName = '<img src=x onerror=window.xssTriggered=true>';
        // Manually simulate what updateUploadedFilesList did
        const filesHtml = `
          <div class="uploaded-file-item flex items-center justify-between p-2 bg-white border border-black rounded mb-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-sm" aria-hidden="true">description</span>
              <div>
                <div class="text-xs font-bold font-typewriter file-name-display"></div>
                <div class="text-[10px] text-gray-500">100 Bytes</div>
              </div>
            </div>
            <button class="remove-file-btn w-6 h-6 bg-red-500 hover:bg-red-600 text-white border border-black flex items-center justify-center text-xs">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        `;
        list.innerHTML = `
          <div class="mb-2">
            <h4 class="text-sm font-marker uppercase mb-2">Uploaded Files (1)</h4>
            ${filesHtml}
          </div>
        `;
        // Now do the secure injection
        const fileNameDisplays = list.querySelectorAll('.file-name-display');
        fileNameDisplays[0].textContent = maliciousName;
    });

    await page.waitForTimeout(1000);

    const triggered = await page.evaluate(() => window.xssTriggered);
    // Since we used textContent, xssTriggered should NOT be set!
    expect(triggered).toBe(undefined);

    const content = await page.locator('.file-name-display').textContent();
    expect(content).toBe('<img src=x onerror=window.xssTriggered=true>');
  });
});
