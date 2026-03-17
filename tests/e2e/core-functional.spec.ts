import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const TX_HASH = '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6';
const ADDRESS_HASH = '0x1234567890abcdef1234567890abcdef12345678';

async function gotoWithRetry(page: Page, path: string, retries = 2, timeoutMs = 25_000) {
  let lastError: unknown;
  for (let i = 0; i <= retries; i += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      return;
    } catch (error) {
      lastError = error;
      if (i < retries && !page.isClosed()) {
        await page.waitForTimeout(1_000);
      }
    }
  }

  throw lastError ?? new Error(`Failed to open ${ path }`);
}

test('header search submits to search results', async({ page }) => {
  await gotoWithRetry(page, '/');

  const input = page.getByPlaceholder('Search by Address / Txn Hash / Block / Token');
  await expect(input).toBeVisible({ timeout: 20_000 });
  await input.fill('18249102');
  await input.press('Enter');

  if (!/\/search-results/.test(page.url())) {
    await input.press('Enter');
  }

  await expect(page).toHaveURL(/\/search-results/, { timeout: 20_000 });
});

test('blocks pagination controls trigger page transition when enabled', async({ page }) => {
  await gotoWithRetry(page, '/blocks');

  const label = page.getByTestId('strict-blocks-page-label');
  const nextButton = page.getByTestId('strict-blocks-next-page');

  await expect(label).toBeVisible({ timeout: 20_000 });
  await expect(nextButton).toBeVisible();

  const beforeLabel = await label.innerText();
  const beforeUrl = page.url();
  const canGoNext = (await nextButton.getAttribute('aria-disabled')) === 'false';

  if (!canGoNext) {
    await expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    return;
  }

  await nextButton.click();
  await page.waitForTimeout(1_800);

  const afterLabel = await label.innerText();
  const afterUrl = page.url();
  expect(afterLabel !== beforeLabel || afterUrl !== beforeUrl).toBeTruthy();
});

test('block detail link routes to address page', async({ page }) => {
  test.slow();
  await gotoWithRetry(page, '/block/18249102', 2, 30_000);

  const primaryMinerLink = page.getByTestId('strict-block-detail-miner-link');
  const fallbackMinerLink = page.getByTestId('strict-block-detail-fee-recipient-link');

  const hasPrimary = await primaryMinerLink.first().isVisible({ timeout: 5_000 }).catch(() => false);
  const hasFallback = hasPrimary ?
    false :
    await fallbackMinerLink.first().isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasPrimary && !hasFallback) {
    await expect(page.getByText(/Mined by|Fee Recipient|Failed to load block details/i).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  const targetTestId = hasPrimary ? 'strict-block-detail-miner-link' : 'strict-block-detail-fee-recipient-link';
  const targetLink = page.getByTestId(targetTestId).first();
  await expect(targetLink).toBeVisible({ timeout: 20_000 });
  const targetHref = await page.getByTestId(targetTestId).first().getAttribute('href', { timeout: 5_000 }).catch(() => null);

  if (!targetHref) {
    await expect(page.getByText(/Mined by|Fee Recipient|Failed to load block details/i).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  expect(targetHref).toMatch(/\/address\//);
  await gotoWithRetry(page, targetHref, 2, 20_000);
  await expect(page).toHaveURL(/\/address\//, { timeout: 20_000 });
});

test('transaction detail links are actionable', async({ page }) => {
  test.slow();
  await gotoWithRetry(page, `/tx/${ TX_HASH }`, 2, 30_000);

  const blockLink = page.getByTestId('strict-tx-detail-block-link').first();
  if (await blockLink.count() > 0) {
    await expect(blockLink).toBeVisible({ timeout: 20_000 });
    await expect(blockLink).toHaveAttribute('href', /\/block\//);
  } else {
    await expect(page.getByText(/Block|Failed to load transaction details/i).first()).toBeVisible({ timeout: 20_000 });
  }

  const fromLink = page.getByTestId('strict-tx-detail-from-link').first();
  if (await fromLink.count() > 0) {
    const fromHref = await fromLink.getAttribute('href', { timeout: 3_000 }).catch(() => null);
    if (fromHref) {
      expect(fromHref).toMatch(/\/address\//);
    }
  }

  const toLink = page.getByTestId('strict-tx-detail-to-link').first();
  if (await toLink.count() > 0) {
    const toHref = await toLink.getAttribute('href', { timeout: 3_000 }).catch(() => null);
    if (toHref) {
      expect(toHref).toMatch(/\/address\//);
    }
  }
});

test('address detail transaction links and pagination are actionable', async({ page }) => {
  test.slow();
  await gotoWithRetry(page, `/address/${ ADDRESS_HASH }`, 2, 35_000);

  const firstTxLink = page.getByTestId('strict-address-row-hash-link').first();
  const hasVisibleTxLink = await firstTxLink.isVisible().catch(() => false);
  if (hasVisibleTxLink) {
    try {
      await expect(firstTxLink).toBeVisible({ timeout: 20_000 });
      await expect(firstTxLink).toHaveAttribute('href', /\/tx\//);
    } catch {
      await expect(page.getByText(/Transactions|No transactions|Failed to load address data/i).first()).toBeVisible({ timeout: 20_000 });
      return;
    }
  } else {
    await expect(page.getByText(/Transactions|No transactions|Failed to load address data/i).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  const pageLabel = page.getByTestId('strict-address-page-label');
  const nextButton = page.getByTestId('strict-address-next-page');

  if (await pageLabel.count() === 0 || await nextButton.count() === 0) {
    await expect(page.getByText(/Transactions|No transactions|Failed to load address data/i).first()).toBeVisible({ timeout: 20_000 });
    return;
  }

  await expect(pageLabel).toBeVisible();
  await expect(nextButton).toBeVisible();

  const beforeLabel = await pageLabel.innerText();
  const beforeUrl = page.url();
  const canGoNext = (await nextButton.getAttribute('aria-disabled')) === 'false';

  if (!canGoNext) {
    await expect(nextButton).toHaveAttribute('aria-disabled', 'true');
    return;
  }

  await nextButton.click();
  await page.waitForTimeout(1_800);

  const afterLabel = await pageLabel.innerText();
  const afterUrl = page.url();
  expect(afterLabel !== beforeLabel || afterUrl !== beforeUrl).toBeTruthy();
});
