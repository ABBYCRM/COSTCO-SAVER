import { defineConfig, devices } from '@playwright/test';

/**
 * COSTCO-SAVER Playwright config.
 *
 * - E2E runs against a real running web app (vite preview of the production build)
 * - The RLS/security suite spins up two distinct browser contexts to assert
 *   multi-user isolation (per spec §50).
 * - Strict: NO waitForTimeout, NO production API, NO test-order dependency.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
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
      testMatch: /tests\/e2e\/security.*\.spec\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
    },
    {
      name: 'mobile-iphone13',
      use: { ...devices['iPhone 13'] },
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
