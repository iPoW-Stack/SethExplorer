import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const ROUTES = [
  { name: 'home', path: '/', readyText: /Latest Blocks/i, retries: 1, timeoutMs: 18_000 },
  { name: 'blocks', path: '/blocks', readyText: /^Blocks$/i, retries: 1, timeoutMs: 18_000 },
  { name: 'txs', path: '/txs', readyText: /^Transactions$/i, retries: 1, timeoutMs: 18_000 },
  { name: 'block detail', path: '/block/18249102', readyText: /Block/i, retries: 2, timeoutMs: 25_000 },
  {
    name: 'tx detail',
    path: '/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
    readyText: /Transaction/i,
    retries: 2,
    timeoutMs: 25_000,
  },
  {
    name: 'address detail',
    path: '/address/0x1234567890abcdef1234567890abcdef12345678',
    readyText: /Address/i,
    retries: 2,
    timeoutMs: 30_000,
  },
];

async function gotoWithRetry(page: Page, path: string, retries = 1, timeoutMs = 18_000) {
  let lastError: unknown;
  for (let i = 0; i <= retries; i += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      return;
    } catch (error) {
      lastError = error;
      if (i < retries && !page.isClosed()) {
        await page.waitForTimeout(1200);
      }
    }
  }
  throw lastError ?? new Error(`Failed to open ${ path } after ${ retries + 1 } attempt(s)`);
}

for (const route of ROUTES) {
  test(`core smoke: ${ route.name }`, async({ page }) => {
    if (route.retries > 1) {
      test.slow();
    }

    await gotoWithRetry(page, route.path, route.retries, route.timeoutMs);

    expect(page.url()).toContain(route.path === '/' ? '/' : route.path);
    await expect(page.getByText(route.readyText).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('a[href="#"]')).toHaveCount(0);
    await expect(page.getByText(/Runtime capture blocked/i)).toHaveCount(0);
  });
}
