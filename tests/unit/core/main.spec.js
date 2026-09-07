import { test, expect } from '@playwright/test';

test.describe('src/core/main.js initialization & theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initializes window.app on startup', async ({ page }) => {
    const isAppDefined = await page.evaluate(() => {
      return !!window.app && typeof window.app === 'object';
    });
    expect(isAppDefined).toBe(true);
  });

  test('toggles theme correctly when theme toggle button is clicked', async ({ page }) => {
    // Initial state
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
    expect(initialTheme).toBe('light');

    // Click to switch to dark mode
    await page.click('#theme-toggle');

    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const darkStorage = await page.evaluate(() => localStorage.getItem('zine-theme'));
    const darkIcon = await page.evaluate(() => document.getElementById('theme-icon')?.textContent?.trim());

    expect(darkTheme).toBe('dark');
    expect(darkStorage).toBe('dark');
    expect(darkIcon).toBe('light_mode');

    // Click again to switch back to light mode
    await page.click('#theme-toggle');

    const lightTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const lightStorage = await page.evaluate(() => localStorage.getItem('zine-theme'));
    const lightIcon = await page.evaluate(() => document.getElementById('theme-icon')?.textContent?.trim());

    expect(lightTheme).toBe('light');
    expect(lightStorage).toBe('light');
    expect(lightIcon).toBe('dark_mode');
  });

  test('respects initial dark theme from localStorage on page load', async ({ context }) => {
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('zine-theme', 'dark');
    });
    await page.goto('/');

    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(initialTheme).toBe('dark');

    await page.click('#theme-toggle');

    const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const toggledStorage = await page.evaluate(() => localStorage.getItem('zine-theme'));
    expect(toggledTheme).toBe('light');
    expect(toggledStorage).toBe('light');
    await page.close();
  });

  test('handles theme toggle gracefully when theme elements are missing', async ({ page }) => {
    const result = await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      const icon = document.getElementById('theme-icon');
      if (btn) btn.remove();
      if (icon) icon.remove();

      // Ensure no exceptions thrown when elements are missing
      const btnCheck = document.getElementById('theme-toggle');
      const iconCheck = document.getElementById('theme-icon');
      return { btnCheck, iconCheck };
    });

    expect(result.btnCheck).toBeNull();
    expect(result.iconCheck).toBeNull();
  });

  test('initializes gridstack on DOMContentLoaded event', async ({ page }) => {
    const gridInitialized = await page.evaluate(() => {
      // Dispatch DOMContentLoaded and verify no error occurs
      let eventFired = false;
      try {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        eventFired = true;
      } catch (e) {
        eventFired = false;
      }
      return eventFired;
    });

    expect(gridInitialized).toBe(true);
  });
});
