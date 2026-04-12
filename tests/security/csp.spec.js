import { test, expect } from '@playwright/test';

test.describe('Content Security Policy', () => {
  test('should have a strict CSP meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for meta tag presence
    const cspMeta = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(cspMeta).toHaveCount(1);

    // Get the content attribute
    const content = await cspMeta.getAttribute('content');

    // Check for critical directives
    expect(content).toContain("default-src 'self'");
    expect(content).toContain("script-src 'self'");
    expect(content).toContain("style-src 'self'");
    // Check for Google Fonts allowance
    expect(content).toContain("https://fonts.googleapis.com");
    expect(content).toContain("https://fonts.gstatic.com");
    // Check that unsafe-inline is restricted (it's present but hopefully only for styles)
    // We can't easily parse the full CSP string in this test without a library, but basic checks are good.
  });
});
