import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-isolation',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /security-isolation\.spec\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /security-isolation\.spec\.ts/,
    },
    {
      name: 'mobile-iphone13',
      use: { ...devices['iPhone 13'] },
      testIgnore: /security-isolation\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm start',
    url: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8080/api/v1/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
