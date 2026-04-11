import { test, expect } from '@playwright/test';

test('Toast should allow safe HTML but sanitize XSS', async ({ page }) => {
  // Navigate to our test page served by Vite
  await page.goto('/tests/security/test-toast.html');
  await page.waitForFunction(() => window.toast);

  // 1. Check Safe HTML (Bold)
  await page.evaluate(() => {
    window.toast.show('info', 'Safe Title', 'This is <b>bold</b> text');
  });

  // Expect <b> tag to be rendered as literal text (textContent used)
  const toastMessage = page.locator('.toast-message').last();
  await expect(toastMessage).toBeVisible();
  await expect(toastMessage).toHaveText('This is <b>bold</b> text');

  // 2. Check XSS (Script)
  await page.evaluate(() => {
    window.toast.show('error', 'XSS Attempt', 'Bad <script>window.xssInjected = true</script>');
  });

  // Script tag should be removed or sanitized
  const scriptTag = page.locator('.toast-message script');
  await expect(scriptTag).not.toBeAttached();

  // Ensure the script didn't execute
  const xssInjected = await page.evaluate(() => window.xssInjected);
  expect(xssInjected).toBeUndefined();

  // 3. Check XSS (Event Handler)
  await page.evaluate(() => {
    window.toast.show('warning', 'Attr XSS', '<img src=x onerror=alert(1)>');
  });

  // Img tag should be removed (not in whitelist) or attribute removed
  const imgTag = page.locator('.toast-message img');
  await expect(imgTag).not.toBeAttached();
});
