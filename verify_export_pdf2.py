import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(record_video_dir="verification/videos/")
        page = context.new_page()

        page.goto("http://localhost:8001/")

        # Mock html2canvas to delay for 5 seconds
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
        """)

        page.click("#export-pdf-btn")

        # Wait for the button to have aria-busy="true"
        page.wait_for_selector('#export-pdf-btn[aria-busy="true"]')

        page.screenshot(path="verification/screenshots/verification2.png")

        time.sleep(2)

        context.close()
        browser.close()

if __name__ == "__main__":
    run()