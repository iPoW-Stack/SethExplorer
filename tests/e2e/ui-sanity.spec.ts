import { expect, test } from '@playwright/test';

import { SAMPLE_ADDRESS, SAMPLE_BLOCK, SAMPLE_TX_HASH, assertNoRuntimeError, gotoWithRetry, waitForNoPersistentLoading } from './utils';

const SANITY_ROUTES = [
  { name: 'home', path: '/', heading: /Latest Blocks|Dashboard/i },
  { name: 'blocks', path: '/blocks', heading: /^Blocks$/i },
  { name: 'txs', path: '/txs', heading: /^Transactions$/i },
  { name: 'block detail', path: `/block/${ SAMPLE_BLOCK }`, heading: /Block/i },
  { name: 'tx detail', path: `/tx/${ SAMPLE_TX_HASH }`, heading: /Transaction/i },
  { name: 'address detail', path: `/address/${ SAMPLE_ADDRESS }`, heading: /Address/i },
];

for (const route of SANITY_ROUTES) {
  test(`ui sanity: ${ route.name } keeps readable layout`, async({ page }) => {
    if (route.name.includes('detail')) {
      test.slow();
      test.setTimeout(100_000);
    }

    await gotoWithRetry(page, route.path, 2, 35_000);
    await waitForNoPersistentLoading(page);
    await assertNoRuntimeError(page);

    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 20_000 });
    const viewport = page.viewportSize();
    const isMobileViewport = Boolean(viewport && viewport.width < 768);

    if (isMobileViewport) {
      await expect(page.locator('main *').first()).toBeVisible({ timeout: 20_000 });
    } else {
      await expect(page.getByText(route.heading).first()).toBeVisible({ timeout: 20_000 });
    }

    const overflowX = await page.evaluate(() => {
      const width = document.documentElement.scrollWidth - window.innerWidth;
      return width > 0 ? width : 0;
    });

    expect(overflowX).toBeLessThan(isMobileViewport ? 420 : 140);
  });
}
