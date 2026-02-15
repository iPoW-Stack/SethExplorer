import type { Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  SAMPLE_ADDRESS,
  SAMPLE_BLOCK,
  SAMPLE_TX_HASH,
  assertNoRuntimeError,
  collectApiFailures,
  gotoWithRetry,
  summarizeApiFailures,
  waitForNoPersistentLoading,
} from './utils';

interface RouteProbe {
  name: string;
  path: string;
  timeoutMs?: number;
  apiPatterns: Array<string>;
  criticalFragments: Array<string>;
  errorPattern: RegExp;
}

const ROUTES: Array<RouteProbe> = [
  {
    name: 'blocks',
    path: '/blocks',
    apiPatterns: [ '**/node-api/proxy/api/v2/blocks**', '**/api/v2/blocks**' ],
    criticalFragments: [ '/api/v2/blocks' ],
    errorPattern: /Failed to load blocks data|Failed to load data/i,
  },
  {
    name: 'transactions',
    path: '/txs',
    apiPatterns: [ '**/node-api/proxy/api/v2/transactions**', '**/api/v2/transactions**' ],
    criticalFragments: [ '/api/v2/transactions' ],
    errorPattern: /Failed to load transactions data|Failed to load data/i,
  },
  {
    name: 'block detail',
    path: `/block/${ SAMPLE_BLOCK }`,
    timeoutMs: 35_000,
    apiPatterns: [ '**/node-api/proxy/api/v2/blocks/**', '**/api/v2/blocks/**' ],
    criticalFragments: [ `/api/v2/blocks/${ SAMPLE_BLOCK }`, '/api/v2/blocks/' ],
    errorPattern: /Failed to load block details|Failed to load data/i,
  },
  {
    name: 'tx detail',
    path: `/tx/${ SAMPLE_TX_HASH }`,
    timeoutMs: 40_000,
    apiPatterns: [ '**/node-api/proxy/api/v2/transactions/**', '**/api/v2/transactions/**' ],
    criticalFragments: [ `/api/v2/transactions/${ SAMPLE_TX_HASH }`, '/api/v2/transactions/' ],
    errorPattern: /Failed to load transaction details|Failed to load data/i,
  },
  {
    name: 'address detail',
    path: `/address/${ SAMPLE_ADDRESS }`,
    timeoutMs: 45_000,
    apiPatterns: [ '**/node-api/proxy/api/v2/addresses/**', '**/api/v2/addresses/**' ],
    criticalFragments: [ `/api/v2/addresses/${ SAMPLE_ADDRESS }`, '/api/v2/addresses/' ],
    errorPattern: /Failed to load address data|Failed to load data/i,
  },
];

const FORCED_ROUTES = ROUTES.filter((route) => route.name !== 'address detail');
const GENERIC_ERROR_PATTERN = /Failed to load|Unable to load|Something went wrong|Data fetch error/i;

async function isVisible(page: Page, pattern: RegExp) {
  const locator = page.getByText(pattern).first();
  if (await locator.count() === 0) {
    return false;
  }
  return locator.isVisible().catch(() => false);
}

async function hasExplicitErrorState(page: Page, route: RouteProbe) {
  const retryButton = page.getByRole('button', { name: 'Retry' }).first();
  const hasRetry = await retryButton.count() > 0 && await retryButton.isVisible().catch(() => false);
  const hasRouteError = await isVisible(page, route.errorPattern);
  const hasGenericError = await isVisible(page, GENERIC_ERROR_PATTERN);

  return hasRetry || hasRouteError || hasGenericError;
}

async function expectExplicitErrorState(page: Page, route: RouteProbe, timeoutMs = 25_000) {
  await expect.poll(async() => {
    return hasExplicitErrorState(page, route);
  }, {
    timeout: timeoutMs,
    message: `Expected explicit error state on ${ route.name }`,
  }).toBeTruthy();
}

async function expectErrorHandledOrUsable(page: Page, route: RouteProbe) {
  if (await hasExplicitErrorState(page, route)) {
    return 'explicit';
  }

  await assertNoRuntimeError(page);
  await expect(page.getByRole('main').first()).toBeVisible({ timeout: 20_000 });
  return 'fallback';
}

async function injectApiFailure(page: Page, patterns: Array<string>, failureMode: 'http500' | 'abort') {
  let hitCount = 0;
  const handlers = patterns.map((pattern) => {
    const handler = async(route: Route) => {
      hitCount += 1;
      if (failureMode === 'abort') {
        await route.abort('failed');
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'forced-e2e-error' }),
      });
    };

    return { pattern, handler };
  });

  for (const item of handlers) {
    await page.route(item.pattern, item.handler);
  }

  return {
    getHitCount: () => hitCount,
    cleanup: async() => {
      for (const item of handlers) {
        await page.unroute(item.pattern, item.handler);
      }
      return hitCount;
    },
  };
}

for (const route of ROUTES) {
  test(`error handling: ${ route.name } remains usable under backend instability`, async({ page }) => {
    test.slow();
    test.setTimeout(110_000);

    const collector = collectApiFailures(page);
    await gotoWithRetry(page, route.path, 2, route.timeoutMs ?? 30_000);
    await waitForNoPersistentLoading(page);

    const failures = collector.getFailures();
    collector.dispose();

    const hasCriticalFailure = failures.some((failure) => route.criticalFragments.some((fragment) => failure.url.includes(fragment)));
    if (hasCriticalFailure) {
      await test.info().attach('api-failures', {
        body: summarizeApiFailures(failures),
        contentType: 'text/plain',
      });

      const handledMode = await expectErrorHandledOrUsable(page, route);
      if (handledMode === 'fallback') {
        test.info().annotations.push({
          type: 'note',
          description: `${ route.name }: API failure observed but UI stayed usable without explicit error banner`,
        });
      }
      return;
    }

    await assertNoRuntimeError(page);
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 20_000 });
  });
}

for (const route of FORCED_ROUTES) {
  test(`error handling: ${ route.name } shows explicit state on forced 500`, async({ page }) => {
    test.slow();
    test.setTimeout(130_000);

    const interceptor = await injectApiFailure(page, route.apiPatterns, 'http500');
    try {
      await gotoWithRetry(page, route.path, 2, route.timeoutMs ?? 30_000);

      await expect.poll(() => interceptor.getHitCount(), {
        timeout: 45_000,
        message: `Forced 500 interceptor was not triggered for ${ route.name }`,
      }).toBeGreaterThan(0);

      await waitForNoPersistentLoading(page, 40_000);
      await expectExplicitErrorState(page, route, 35_000);
    } finally {
      await interceptor.cleanup();
    }
  });
}

test('error handling: blocks shows explicit state on aborted request', async({ page }) => {
  test.slow();
  test.setTimeout(120_000);

  const route = ROUTES[0];
  const interceptor = await injectApiFailure(page, route.apiPatterns, 'abort');
  try {
    await gotoWithRetry(page, route.path, 2, route.timeoutMs ?? 30_000);

    await expect.poll(() => interceptor.getHitCount(), {
      timeout: 45_000,
      message: 'Forced abort interceptor was not triggered for blocks',
    }).toBeGreaterThan(0);

    await waitForNoPersistentLoading(page, 40_000);
    await expectExplicitErrorState(page, route, 35_000);
  } finally {
    await interceptor.cleanup();
  }
});
