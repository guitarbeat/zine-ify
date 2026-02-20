from playwright.sync_api import sync_playwright
import os

def run():
    print("Starting Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:8000")

            print("Uploading PDF...")
            # Need absolute path for file upload
            file_path = os.path.abspath("test-16-pages.pdf")
            page.locator("#pdf-upload").set_input_files(file_path)

            print("Waiting for grid input...")
            page.locator("#grid-rows").wait_for(state="visible", timeout=60000)

            print("Waiting for processing to hide...")
            page.locator("#progress-container").wait_for(state="hidden", timeout=30000)

            # Test debounce logic
            print("Updating grid rows to 10...")
            grid_rows = page.locator("#grid-rows")
            grid_rows.click()
            grid_rows.fill("")
            grid_rows.type("1", delay=100)
            grid_rows.type("0", delay=100)

            # Wait for debounce and DOM update (300ms + render time)
            print("Waiting for debounce...")
            page.wait_for_timeout(1000)

            print("Verifying result...")
            total_text = page.locator("#grid-total").text_content()
            print(f"Total pages text: {total_text}")

            # 10 rows * 4 cols (default) = 40 pages
            if "40 pages" not in total_text:
                print(f"ERROR: Grid total text mismatch! Found: {total_text}")
            else:
                print("SUCCESS: Grid updated correctly.")

            # Take screenshot of the grid settings and part of the preview
            print("Taking screenshot...")
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/grid_debounce_check.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
            print("Done.")

if __name__ == "__main__":
    run()
