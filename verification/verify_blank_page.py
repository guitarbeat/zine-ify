from playwright.sync_api import sync_playwright
import time
import os

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate
    page.goto("http://localhost:8000")

    # Upload PDF
    # Assuming test-verify.pdf is in current directory
    pdf_path = os.path.abspath("test-verify.pdf")
    page.set_input_files("#pdf-upload", pdf_path)

    # Wait for processing
    page.locator("#progress-container").wait_for(state="hidden", timeout=20000)
    page.locator(".toast-success").wait_for(state="visible", timeout=10000)

    # Wait for images to render (give it a moment for src to be set)
    time.sleep(2)

    # Screenshot
    page.screenshot(path="verification/blank_page_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
