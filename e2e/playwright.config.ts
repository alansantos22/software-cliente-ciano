import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './helpers/global-setup',
  globalTeardown: './helpers/global-teardown',
  fullyParallel: false, // sequential to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
      use: {
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      },
    },
    {
      name: 'ui',
      testMatch: 'tests/ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
        locale: 'pt-BR',
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'ui-mobile',
      testMatch: 'tests/ui/**/*.spec.ts',
      use: {
        ...devices['iPhone 13'],
        baseURL: 'http://localhost:5173',
        locale: 'pt-BR',
      },
    },
  ],
});
