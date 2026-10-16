import { defineConfig, devices } from '@playwright/test';
import { baseUrl } from './src/config.mjs';

const target = baseUrl || 'http://127.0.0.1:8000';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 35_000,
  expect: { timeout: 9_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'artifacts/junit.xml' }],
    ['json', { outputFile: 'artifacts/playwright.json' }]
  ],
  use: {
    baseURL: target.replace(/\/+$/, ''),
    actionTimeout: 12_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: false
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] }, grep: /@smoke|@mobile/ }
  ]
});
