from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            print("Navigating to app on port 8000...")
            page.goto("http://localhost:8000")

            # Wait for title
            page.wait_for_selector("h1:has-text('Zine-ify')", timeout=10000)
            print("Found header.")

            # Wait a bit for JS to init
            page.wait_for_timeout(1000)

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/app_loaded.png")
            print("Screenshot saved to verification/app_loaded.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
