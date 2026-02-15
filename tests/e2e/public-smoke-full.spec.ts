import { expect, test } from '@playwright/test';

import { SAMPLE_ADDRESS, SAMPLE_BLOCK, SAMPLE_TOKEN, SAMPLE_TX_HASH, assertNoRuntimeError, collectApiFailures, gotoWithRetry, summarizeApiFailures, waitForNoPersistentLoading } from './utils';

const ROUTES = [
  { name: 'home', path: '/', readyText: /Latest Blocks|Dashboard/i },
  { name: 'blocks', path: '/blocks', readyText: /^Blocks$/i },
  { name: 'transactions', path: '/txs', readyText: /^Transactions$/i },
  { name: 'block detail', path: `/block/${ SAMPLE_BLOCK }`, readyText: /Block/i, retries: 3, timeoutMs: 35_000 },
  { name: 'tx detail', path: `/tx/${ SAMPLE_TX_HASH }`, readyText: /Transaction/i, retries: 3, timeoutMs: 35_000 },
  { name: 'address detail', path: `/address/${ SAMPLE_ADDRESS }`, readyText: /Address/i, retries: 3, timeoutMs: 40_000 },
  { name: 'search results', path: `/search-results?q=${ SAMPLE_BLOCK }`, readyText: /Search/i },
  { name: 'tokens', path: '/tokens', readyText: /Tokens/i },
  { name: 'token detail', path: `/token/${ SAMPLE_TOKEN }`, readyText: /Token/i, retries: 2, timeoutMs: 35_000 },
  { name: 'token transfers', path: '/token-transfers', readyText: /Token transfers/i },
  { name: 'internal txs', path: '/internal-txs', readyText: /Internal txns|Internal transactions/i },
  { name: 'verified contracts', path: '/verified-contracts', readyText: /Verified contracts/i },
  { name: 'accounts', path: '/accounts', readyText: /Top accounts|Accounts/i },
  { name: 'api docs', path: '/api-docs', readyText: /API|Swagger/i },
  { name: 'stats', path: '/stats', readyText: /Charts|Statistics|Stats/i },
  { name: 'gas tracker', path: '/gas-tracker', readyText: /Gas tracker|Gas/i },
  { name: 'csv export', path: '/csv-export', readyText: /CSV export|Export/i },
];

for (const route of ROUTES) {
  test(`public smoke: ${ route.name }`, async({ page }) => {
    const retries = route.retries ?? 2;
    const timeoutMs = route.timeoutMs ?? 30_000;
    const testTimeout = Math.max(100_000, timeoutMs * (retries + 1) + 20_000);
    test.setTimeout(testTimeout);
    if (retries > 1) {
      test.slow();
    }

    const collector = collectApiFailures(page);
    const response = await gotoWithRetry(
      page,
      route.path,
      retries,
      timeoutMs,
    );

    if (response) {
      expect(response.status()).toBeLessThan(500);
    }

    await waitForNoPersistentLoading(page);
    await assertNoRuntimeError(page);

    const readyLocator = page.getByText(route.readyText).first();
    try {
      await expect(readyLocator).toBeVisible({ timeout: 20_000 });
    } catch {
      await expect(page.getByRole('main').first()).toBeVisible({ timeout: 20_000 });
    }

    const failures = collector.getFailures();
    collector.dispose();

    if (failures.length > 0) {
      await test.info().attach('api-failures', {
        body: summarizeApiFailures(failures),
        contentType: 'text/plain',
      });
    }
  });
}
