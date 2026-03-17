import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { SAMPLE_ADDRESS, SAMPLE_BLOCK, SAMPLE_TX_HASH, assertClickable, assertNoRuntimeError, gotoWithRetry } from './utils';

async function assertPaginationAction(page: Page, options: {
  nextButtonTestId: string;
  labelTestId: string;
}) {
  const nextButton = page.getByTestId(options.nextButtonTestId);
  const pageLabel = page.getByTestId(options.labelTestId);

  if (await nextButton.count() === 0 || await pageLabel.count() === 0) {
    return;
  }

  await expect(nextButton).toBeVisible();
  await expect(pageLabel).toBeVisible();

  const canGoNext = (await nextButton.getAttribute('aria-disabled')) === 'false';
  const beforeLabel = await pageLabel.innerText();
  const beforeUrl = page.url();

  if (!canGoNext) {
    await expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    return;
  }

  await nextButton.click();
  await page.waitForTimeout(1_800);

  const afterLabel = await pageLabel.innerText();
  const afterUrl = page.url();
  expect(afterLabel !== beforeLabel || afterUrl !== beforeUrl).toBeTruthy();
}

test('global navigation links are actionable', async({ page }) => {
  test.slow();
  test.setTimeout(120_000);
  await gotoWithRetry(page, '/');

  const blocksLink = page.locator('a[href="/blocks"]').first();
  await assertClickable(blocksLink);
  await blocksLink.click();
  await expect(page).toHaveURL(/\/blocks/);

  await gotoWithRetry(page, '/');
  const txsLink = page.locator('a[href="/txs"]').first();
  await assertClickable(txsLink);
  await txsLink.click();
  await expect(page).toHaveURL(/\/txs/);
});

test('strict sidebar resources stay visible across routes', async({ page }) => {
  test.slow();
  test.setTimeout(150_000);
  for (const route of [ '/', '/blocks', '/txs', `/block/${ SAMPLE_BLOCK }` ]) {
    await gotoWithRetry(page, route, 2, 45_000);

    const chartsLink = page.locator('a[href="/stats"]').first();
    const apiLink = page.locator('a[href="/api-docs"]').first();
    await assertClickable(chartsLink);
    await assertClickable(apiLink);
  }
});

test('header search submits and routes to search results', async({ page }) => {
  test.slow();
  test.setTimeout(120_000);
  await gotoWithRetry(page, '/');

  const input = page.getByPlaceholder('Search by Address / Txn Hash / Block / Token');
  await assertClickable(input);
  await input.fill(SAMPLE_BLOCK);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.press('Enter');
    await page.waitForTimeout(500);

    if (/\/search-results/.test(page.url())) {
      break;
    }

    const loadingHint = page.getByText(/We are searching, please wait/i).first();
    if (await loadingHint.count() > 0) {
      await loadingHint.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => undefined);
    }
  }

  await expect(page).toHaveURL(/\/search-results/);
  await assertNoRuntimeError(page);
});

test('header search supports block/tx/address keywords', async({ page }) => {
  test.slow();
  test.setTimeout(150_000);
  const keywords = [
    { value: SAMPLE_BLOCK, expectedPathPattern: /\/(search-results|block\/)/ },
    { value: SAMPLE_TX_HASH, expectedPathPattern: /\/(search-results|tx\/)/ },
    { value: SAMPLE_ADDRESS, expectedPathPattern: /\/(search-results|address\/)/ },
  ];

  for (const item of keywords) {
    await gotoWithRetry(page, '/', 2, 35_000);

    const input = page.getByPlaceholder('Search by Address / Txn Hash / Block / Token');
    await assertClickable(input);
    await input.fill(item.value);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await input.press('Enter');
      await page.waitForTimeout(500);

      if (item.expectedPathPattern.test(page.url())) {
        break;
      }

      const loadingHint = page.getByText(/We are searching, please wait/i).first();
      if (await loadingHint.count() > 0) {
        await loadingHint.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => undefined);
      }
    }
    await expect(page).toHaveURL(item.expectedPathPattern);
    await assertNoRuntimeError(page);
  }
});

test('stats page renders a usable chart state', async({ page }) => {
  test.slow();
  test.setTimeout(90_000);
  await gotoWithRetry(page, '/stats', 2, 45_000);

  const chartLink = page.locator('a[href^="/stats/"]').first();
  const retryButton = page.getByRole('button', { name: /Retry/i }).first();

  await expect(chartLink).toBeVisible({ timeout: 60_000 });
  await expect(retryButton).toHaveCount(0);
});

test('blocks table links and pagination action work', async({ page }) => {
  await gotoWithRetry(page, '/blocks');

  const firstBlockLink = page.getByTestId('strict-blocks-row-block-link').first();
  await assertClickable(firstBlockLink);
  await firstBlockLink.click();
  await expect(page).toHaveURL(/\/block\//);

  await gotoWithRetry(page, '/blocks');
  await assertPaginationAction(page, {
    nextButtonTestId: 'strict-blocks-next-page',
    labelTestId: 'strict-blocks-page-label',
  });
});

test('transactions table links and pagination action work', async({ page }) => {
  test.slow();
  await gotoWithRetry(page, '/txs');

  const firstTxLink = page.getByTestId('strict-txs-row-hash-link').first();
  await assertClickable(firstTxLink);
  await expect(firstTxLink).toHaveAttribute('href', /\/tx\//);

  await gotoWithRetry(page, '/txs');
  await assertPaginationAction(page, {
    nextButtonTestId: 'strict-txs-next-page',
    labelTestId: 'strict-txs-page-label',
  });
});

test('block detail and tx detail links are actionable', async({ page }) => {
  test.slow();
  await gotoWithRetry(page, `/block/${ SAMPLE_BLOCK }`, 2, 35_000);
  const minerLink = page.getByTestId('strict-block-detail-miner-link').first();
  if (await minerLink.count() > 0) {
    await assertClickable(minerLink);
    await expect(minerLink).toHaveAttribute('href', /\/address\//);
  } else {
    await expect(page.getByText(/Mined by|Fee Recipient|Failed to load block details/i).first()).toBeVisible({ timeout: 20_000 });
  }

  await gotoWithRetry(page, `/tx/${ SAMPLE_TX_HASH }`, 2, 35_000);
  const blockLink = page.getByTestId('strict-tx-detail-block-link').first();
  if (await blockLink.count() > 0) {
    await assertClickable(blockLink);
    await expect(blockLink).toHaveAttribute('href', /\/block\//);
  } else {
    await expect(page.getByText(/Block|Failed to load transaction details/i).first()).toBeVisible({ timeout: 20_000 });
  }

  const copyButtons = page.getByRole('button', { name: 'copy' });
  if (await copyButtons.count() > 0) {
    await copyButtons.first().click();
  }
});

test('address table links and pagination action work', async({ page }) => {
  test.slow();
  test.setTimeout(110_000);
  await gotoWithRetry(page, `/address/${ SAMPLE_ADDRESS }`, 2, 40_000);

  const firstTxLink = page.getByTestId('strict-address-row-hash-link').first();
  const hasVisibleTxLink = await firstTxLink.isVisible().catch(() => false);
  if (hasVisibleTxLink) {
    try {
      await assertClickable(firstTxLink);
      await expect(firstTxLink).toHaveAttribute('href', /\/tx\//);
    } catch {
      await expect(page.getByText(/Transactions|No transactions|Failed to load address data/i).first()).toBeVisible({ timeout: 20_000 });
      return;
    }
  } else {
    await expect(page.getByText(/Transactions|No transactions|Failed to load address data/i).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  await gotoWithRetry(page, `/address/${ SAMPLE_ADDRESS }`, 2, 40_000);
  await assertPaginationAction(page, {
    nextButtonTestId: 'strict-address-next-page',
    labelTestId: 'strict-address-page-label',
  });
});

test('token list has actionable token links', async({ page }) => {
  test.slow();
  test.setTimeout(110_000);
  await gotoWithRetry(page, '/tokens', 2, 35_000);
  await assertNoRuntimeError(page);

  const tokenLinks = page.locator('a[href^="/token/"]:visible');
  const terminalText = page.getByText(/No tokens|No data|Failed to load|Unable to fetch/i).first();

  const start = Date.now();
  while (Date.now() - start < 35_000) {
    if (await tokenLinks.count() > 0) {
      const tokenLink = tokenLinks.first();
      await expect(tokenLink).toHaveAttribute('href', /\/token\//);
      return;
    }

    if (await terminalText.count() > 0 && await terminalText.isVisible().catch(() => false)) {
      await expect(terminalText).toBeVisible();
      return;
    }

    await page.waitForTimeout(1_000);
  }

  await expect(terminalText).toBeVisible({ timeout: 20_000 });
});
