
import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'npm run dev',
    port: 8000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:8000',
  },
});
