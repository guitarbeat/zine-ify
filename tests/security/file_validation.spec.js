import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('Should reject files without PDF signature', async ({ page }) => {
  await page.goto('/');

  // Create a dummy non-PDF file
  const buffer = Buffer.from('This is not a PDF file. It is just text.');

  // Get the file input
  const fileInput = page.locator('#pdf-upload');

  // Upload the invalid file
  await fileInput.setInputFiles({
    name: 'fake.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  // Check for the specific error message in the toast
  const toastMessage = page.locator('#toast-container');
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});

test('Should reject polyglot files (valid signature not at offset 0)', async ({ page }) => {
  await page.goto('/');

  // Create a polyglot file: starts with junk but has %PDF- later
  // The validateFileSignature function checks the file header strictly.
  // So this MUST fail the check.
  const buffer = Buffer.from('JUNK_HEADER_DATA_TO_BYPASS_OFFSET_0\n%PDF-1.7\nRest of the file');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'polyglot.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  const toastMessage = page.locator('#toast-container');
  // We expect this to fail validation, so we look for the error message
  await expect(toastMessage).toContainText('Invalid file signature', { timeout: 5000 });
});

test('Should accept files with valid PDF signature (even if corrupted later)', async ({ page }) => {
  await page.goto('/');

  // Create a file with valid PDF header
  const buffer = Buffer.from('%PDF-1.7\n%This is a valid header\nBut the rest is garbage.');

  const fileInput = page.locator('#pdf-upload');

  await fileInput.setInputFiles({
    name: 'valid_header.pdf',
    mimeType: 'application/pdf',
    buffer
  });

  const toastMessage = page.locator('#toast-container');

  // Wait for ANY toast message
  await expect(toastMessage).toBeVisible();

  // It should NOT be the signature error
  await expect(toastMessage).not.toContainText('Invalid file signature');

  // It will likely be a PDF parsing error
  // checking that we proceed past the signature check
});
