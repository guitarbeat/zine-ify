import { test, expect } from '@playwright/test';

test.describe('PWA install setup', () => {
  test('exposes manifest and install UI', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest'
    );

    const manifestResponse = await page.request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('Zine-ify');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.length).toBeGreaterThan(0);

    await expect(page.locator('pwa-install')).toHaveCount(1);
    await expect(page.locator('#pwa-install-trigger')).toHaveCount(1);
  });
});
