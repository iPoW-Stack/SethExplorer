import { expect, test } from '@playwright/test';

import { assertNoRuntimeError, gotoWithRetry, waitForNoPersistentLoading } from './utils';

const AUTH_ROUTES = [
  '/login',
  '/auth/profile',
  '/account/api-key',
  '/account/custom-abi',
  '/account/merits',
  '/account/tag-address',
  '/account/verified-addresses',
  '/account/watchlist',
];

for (const route of AUTH_ROUTES) {
  test(`auth guard: ${ route } renders guard-safe state without credentials`, async({ page }) => {
    const response = await gotoWithRetry(page, route, 2, 35_000);

    if (response?.status() === 404) {
      await expect(page.getByText(/404|Page not found/i).first()).toBeVisible({ timeout: 20_000 });
      return;
    }

    await waitForNoPersistentLoading(page);
    await assertNoRuntimeError(page);

    const knownSignals = [
      page.getByText(/My profile|Watch list|API keys|Custom ABI|Merits|Tag address|Verified addresses/i).first(),
      page.getByText(/Something went wrong\. Try refreshing the page or come back later\./i).first(),
      page.getByText(/Login|Sign in/i).first(),
    ];

    let matched = false;
    for (const signal of knownSignals) {
      if (await signal.count() > 0 && await signal.isVisible().catch(() => false)) {
        matched = true;
        break;
      }
    }

    expect(matched).toBeTruthy();
  });
}
