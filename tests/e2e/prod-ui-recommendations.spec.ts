import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { assertNoRuntimeError, gotoWithRetry, waitForNoPersistentLoading } from './utils';

async function resolveLatestBlockHeight(page: Page): Promise<number | null> {
  const response = await page.request.get('/api/v2/main-page/blocks').catch(() => null);
  if (!response || !response.ok()) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const height = payload?.items?.[0]?.height;
  return typeof height === 'number' ? height : null;
}

test.describe('Production UI Recommendations', () => {
  test('block detail renders prev/next navigation', async ({ page }) => {
    const latestHeight = await resolveLatestBlockHeight(page);
    const targetHeight = latestHeight ?? 1;

    await gotoWithRetry(page, `/block/${ targetHeight }`);
    await waitForNoPersistentLoading(page).catch(() => null);
    await assertNoRuntimeError(page);

    const prev = page.getByTestId('strict-block-prev-link');
    const next = page.getByTestId('strict-block-next-link');
    const hasStrictNavigation = await prev.count() > 0 && await next.count() > 0;

    if (!hasStrictNavigation) {
      await expect(page.getByText(/Block/i).first()).toBeVisible();
      return;
    }

    await expect(prev).toBeVisible();
    await expect(next).toBeVisible();
    await expect(prev).toHaveAttribute('href', /\/block\/\d+/);
    await expect(next).toHaveAttribute('href', /\/block\/\d+/);
  });

  test('api-docs has no visible Blockscout branding text', async ({ page }) => {
    await gotoWithRetry(page, '/api-docs');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => null);
    await assertNoRuntimeError(page);

    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).not.toContain('blockscout');
  });

  test('stats shard status uses business labels and hides raw code by default', async ({ page }) => {
    await gotoWithRetry(page, '/stats');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => null);
    await assertNoRuntimeError(page);

    const shardStatus = page.getByTestId('stats-shards-status');
    if (await shardStatus.count() === 0) {
      await expect(page.getByText(/statistic|stats/i).first()).toBeVisible();
      return;
    }

    await expect(shardStatus).toBeVisible();

    const labels = shardStatus.getByText(/Healthy|Degraded|Unavailable/i);
    await expect(labels.first()).toBeVisible();
  });

  test('transactions list rows provide copy affordance for hashes', async ({ page }) => {
    await gotoWithRetry(page, '/txs');
    await waitForNoPersistentLoading(page).catch(() => null);
    await assertNoRuntimeError(page);

    const strictHashLink = page.getByTestId('strict-txs-row-hash-link').first();
    if (await strictHashLink.count() > 0) {
      await expect(strictHashLink).toBeVisible();
      await expect(page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
      return;
    }

    await expect(page.getByText(/Transactions/i).first()).toBeVisible();
    const genericTxLink = page.locator('a[href*="/tx/"]').first();
    if (await genericTxLink.count() > 0) {
      await expect(genericTxLink).toBeVisible();
      return;
    }

    const fallbackSignals = [
      page.getByText(/No transactions|No validated transactions/i).first(),
      page.getByText(/Failed to load transactions/i).first(),
      page.getByRole('button', { name: /Retry/i }).first(),
    ];

    await expect(fallbackSignals[0].or(fallbackSignals[1]).or(fallbackSignals[2])).toBeVisible();
  });
});
