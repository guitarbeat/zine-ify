import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(record_video_dir="verification/videos/")
        page = context.new_page()

        page.goto("http://localhost:8001/")

        # We need to trigger a PDF upload first to enable export button functionality,
        # or we can manually enable it by interacting with the page / overriding the check.
        # Let's override the check in UI that disables export if there's no content
        page.add_init_script("""
            window.html2canvas = function() {
                return new Promise(resolve => {
                    setTimeout(() => {
                        const canvas = document.createElement('canvas');
                        canvas.width = 100;
                        canvas.height = 100;
                        resolve(canvas);
                    }, 5000);
                });
            };

            // Bypass empty content check in MainController handleExport
            window._appHasContentOverride = true;
        """)

        # In js, this.ui.hasContent() returns true if there is content.
        # Since we want to click the button and trigger the export:
        page.evaluate("""
            window.__zineApp.ui.hasContent = function() { return true; };
        """)

        page.click("#exportPdfBtn")

        # Wait for the button to have aria-busy="true"
        page.wait_for_selector('#exportPdfBtn[aria-busy="true"]')

        page.screenshot(path="verification/screenshots/verification2.png")

        time.sleep(2)

        context.close()
        browser.close()

if __name__ == "__main__":
    run()