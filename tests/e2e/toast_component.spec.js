import { test, expect } from "@playwright/test";

test.describe("Toast Component E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?expose-toast=1");
    await page.waitForFunction(() => window.__zineifyToast);
  });

  test("should check container accessibility attributes", async ({ page }) => {
    const container = page.locator("#toast-container");
    await expect(container).toBeAttached();
    await expect(container).toHaveAttribute("aria-live", "polite");
    await expect(container).toHaveAttribute("role", "region");
    await expect(container).toHaveAttribute("aria-label", "Notifications");
  });

  test("should show success, warning, info, and error toasts with correct roles", async ({ page }) => {
    await page.evaluate(() => {
      window.__zineifyToast.success("Success Title", "Success Msg");
      window.__zineifyToast.error("Error Title", "Error Msg");
      window.__zineifyToast.warning("Warning Title", "Warning Msg");
      window.__zineifyToast.info("Info Title", "Info Msg");
    });

    const successToast = page.locator(".toast-success");
    await expect(successToast).toBeVisible();
    await expect(successToast).toHaveAttribute("role", "status");
    await expect(successToast.locator(".toast-title")).toHaveText("Success Title");
    await expect(successToast.locator(".toast-message")).toHaveText("Success Msg");

    const errorToast = page.locator(".toast-error");
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toHaveAttribute("role", "alert");

    const warningToast = page.locator(".toast-warning");
    await expect(warningToast).toBeVisible();

    const infoToast = page.locator(".toast-info");
    await expect(infoToast).toBeVisible();
  });

  test("should remove toast when close button is clicked", async ({ page }) => {
    await page.evaluate(() => {
      window.__zineifyToast.show("info", "Dismissible Toast");
    });

    const toastElement = page.locator(".toast-info").last();
    await expect(toastElement).toBeVisible();

    await page.evaluate(() => {
      const btn = document.querySelector(".toast-info .toast-close");
      if (btn) btn.click();
    });

    await expect(toastElement).not.toBeAttached({ timeout: 5000 });
  });

  test("should auto-close toast after specified duration", async ({ page }) => {
    await page.evaluate(() => {
      window.__zineifyToast.show("info", "Quick Auto Close", "Message", 300);
    });

    const toastElement = page.locator(".toast-info").last();
    await expect(toastElement).toBeVisible();

    await expect(toastElement).not.toBeAttached({ timeout: 5000 });
  });

  test("should fallback to info icon for unknown toast type", async ({ page }) => {
    await page.evaluate(() => {
      window.__zineifyToast.show("unknown_type", "Unknown Type");
    });

    const toastElement = page.locator(".toast-unknown_type");
    await expect(toastElement).toBeVisible();
    const iconContainer = toastElement.locator(".toast-icon");
    await expect(iconContainer).toBeAttached();
  });
});
