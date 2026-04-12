import { test, expect } from '@playwright/test';
import { jsPDF } from 'jspdf';

function createPdfBuffer(label) {
  const doc = new jsPDF();
  doc.text(label, 10, 10);
  return Buffer.from(doc.output('arraybuffer'));
}

test('opens the 3D preview modal with a sized canvas', async ({ page }) => {
  await page.goto('/');

  await page.locator('#pdf-upload').setInputFiles({
    name: '3d-preview.pdf',
    mimeType: 'application/pdf',
    buffer: createPdfBuffer('3D')
  });

  await expect(page.locator('#upload-status')).toContainText('Imported 1 of 1 pages from 3d-preview.pdf', { timeout: 30000 });

  await page.locator('#view3dBtn').click();

  const modal = page.locator('#zine-3d-modal');
  await expect(modal).toBeVisible();

  await page.waitForFunction(() => {
    const canvas = document.querySelector('#zine-3d-container canvas');
    if (!canvas) {
      return false;
    }

    return canvas.clientWidth > 0 && canvas.clientHeight > 0;
  }, { timeout: 10000 });

  const canvasBox = await page.locator('#zine-3d-container canvas').boundingBox();
  expect(canvasBox?.width || 0).toBeGreaterThan(0);
  expect(canvasBox?.height || 0).toBeGreaterThan(0);

  await page.locator('#fold-slider').fill('2');
  await expect(page.locator('#fold-status')).toHaveText('Cross Collapse');

  await page.locator('#fold-slider').fill('3');
  await expect(page.locator('#fold-status')).toHaveText('Booklet');
});
