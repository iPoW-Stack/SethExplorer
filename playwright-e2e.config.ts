import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || process.env.RUNTIME_BASE_URL || 'http://localhost:8095';
const serverPort = new URL(baseURL).port || '8095';
const shouldStartWebServer = !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [ [ 'dot' ], [ 'html', { open: 'never' } ] ] : 'list',
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
  webServer: shouldStartWebServer ? {
    command: `node ./node_modules/next/dist/bin/next dev -p ${ serverPort }`,
    url: `${ baseURL }/`,
    reuseExistingServer: true,
    timeout: 360_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_PORT: serverPort,
      NEXT_PUBLIC_SETH_STRICT_MODE: process.env.NEXT_PUBLIC_SETH_STRICT_MODE || 'true',
      NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE: process.env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE || 'live',
      NEXT_DISABLE_WEBPACK_CACHE: '1',
    },
  } : undefined,
});
