import { expect, test } from '@playwright/test';

test('home view-all links navigate to blocks and txs', async({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const blocksViewAll = page.getByTestId('strict-home-view-all-blocks');
  const txsViewAll = page.getByTestId('strict-home-view-all-txs');

  await expect(blocksViewAll).toBeVisible({ timeout: 20_000 });
  await expect(txsViewAll).toBeVisible({ timeout: 20_000 });
  await expect(blocksViewAll).toHaveAttribute('href', '/blocks');
  await expect(txsViewAll).toHaveAttribute('href', '/txs');
});

test('blocks page row links are navigable', async({ page }) => {
  await page.goto('/blocks', { waitUntil: 'domcontentloaded' });

  const firstBlockLink = page.getByTestId('strict-blocks-row-block-link').first();
  await expect(firstBlockLink).toBeVisible({ timeout: 20_000 });
  await firstBlockLink.click();
  await expect(page).toHaveURL(/\/block\//);
});

test('transactions page hash links are navigable', async({ page }) => {
  await page.goto('/txs', { waitUntil: 'domcontentloaded' });

  const firstTxLink = page.getByTestId('strict-txs-row-hash-link').first();
  await expect(firstTxLink).toBeVisible({ timeout: 20_000 });
  await expect(firstTxLink).toHaveAttribute('href', /\/tx\//);
});
