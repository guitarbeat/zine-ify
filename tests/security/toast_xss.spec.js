import { test, expect } from '@playwright/test';

test('Toast should allow safe HTML but sanitize XSS', async ({ page }) => {
  await page.goto('/?expose-toast=1');
  await page.waitForFunction(() => window.__zineifyToast);

  // 1. Check Safe HTML (Bold)
  await page.evaluate(() => {
    window.__zineifyToast.show('info', 'Safe Title', 'This is <b>bold</b> text');
  });

  // Expect <b> tag to be rendered as an HTML element (sanitizeHTML used)
  const toastMessage = page.locator('.toast-success, .toast-info').last();
  await expect(toastMessage).toBeVisible();
  const boldTag = toastMessage.locator('b');
  await expect(boldTag).toHaveText('bold');

  // 2. Check XSS (Script)
  await page.evaluate(() => {
    window.__zineifyToast.show('error', 'XSS Attempt', 'Bad <script>window.xssInjected = true</script>');
  });

  // Script tag should be removed or sanitized
  const scriptTag = page.locator('.toast-success, .toast-info script');
  await expect(scriptTag).not.toBeAttached();

  // Ensure the script didn't execute
  const xssInjected = await page.evaluate(() => window.xssInjected);
  expect(xssInjected).toBeUndefined();

  // 3. Check XSS (Event Handler)
  await page.evaluate(() => {
    window.__zineifyToast.show('warning', 'Attr XSS', '<img src=x onerror=alert(1)>');
  });

  // Img tag should be removed (not in whitelist) or attribute removed
  const imgTag = page.locator('.toast-success, .toast-info img');
  await expect(imgTag).not.toBeAttached();
});
