import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

function createPdfBuffer(pageCount = 10) {
  const doc = new jsPDF();

  for (let index = 1; index <= pageCount; index++) {
    if (index > 1) {
      doc.addPage();
    }

    doc.setFontSize(28);
    doc.text(`Page ${index}`, 20, 40);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

test('mobile layout avoids horizontal overflow on a narrow phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 653 });
  await page.goto('/');

  await expect(page.locator('#open-rail-sheet-btn')).toContainText('Settings');
  await expectNoHorizontalOverflow(page);
});

test('mobile page picker stays within the viewport at 280px width', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 653 });
  await page.goto('/');

  await page.locator('#pdf-upload').setInputFiles({
    name: 'mobile-picker.pdf',
    mimeType: 'application/pdf',
    buffer: createPdfBuffer()
  });

  await expect(page.locator('#page-picker-modal')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#page-picker-count')).toContainText('8 of 8 selected');
  await expect(page.locator('#page-picker-select-even')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
