import { test, expect } from '@playwright/test';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

test.beforeAll(async () => {
  if (!fs.existsSync('test-16-pages.pdf')) {
    console.log('Generating test-16-pages.pdf...');
    execSync('node scripts/create_test_pdf.js');
  }
});

test('Verify accessibility of flip buttons', async ({ page }) => {
  // 1. Go to app
  await page.goto('/');

  // 2. Upload PDF
  // We need to resolve the path relative to the current working directory where the test is running
  const fileInput = page.locator('#pdf-upload');
  await fileInput.setInputFiles('test-16-pages.pdf');

  // 3. Wait for processing to finish
  // The toast success message is a good indicator
  await expect(page.locator('.toast-success').filter({ hasText: 'Done!' })).toBeVisible({ timeout: 15000 });

  // 4. Verify flip buttons exist
  // We expect 16 flip buttons for a 16 page PDF in accordion layout
  const flipButtons = page.locator('.flip-btn');
  await expect(flipButtons).toHaveCount(16);

  // 5. Check specific aria-labels
  // First button (Page 4 in accordion layout)
  const firstButton = flipButtons.first();
  // Expect the NEW accessible label
  await expect(firstButton).toHaveAttribute('aria-label', 'Rotate Page 4 180 degrees');

  // Fourth button (Page 1 -> Cover)
  const fourthButton = flipButtons.nth(3);
  await expect(fourthButton).toHaveAttribute('aria-label', 'Rotate Cover 180 degrees');

  // Last button (Page 16 -> Back)
  const lastButton = flipButtons.last();
  await expect(lastButton).toHaveAttribute('aria-label', 'Rotate Back 180 degrees');
});
