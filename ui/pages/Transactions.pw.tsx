import React from 'react';

import * as statsMock from 'mocks/stats/index';
import * as txMock from 'mocks/txs/tx';
import * as txStatsMock from 'mocks/txs/stats';
import { test, expect, devices } from 'playwright/lib';

import Transactions from './Transactions';

const hooksConfig = {
  router: {
    query: { tab: 'validated' },
    isReady: true,
  },
};

const validatedTxsResponse = {
  items: [ txMock.base, txMock.withContractCreation, txMock.withTokenTransfer ],
  next_page_params: null,
};

const txStatsResponse = {
  transactions_24h: { id: 'transactions_24h', title: 'Transactions', value: '992890', description: '', units: '' },
  pending_transactions_30m: { id: 'pending_transactions_30m', title: 'Pending transactions', value: '4200', description: '', units: '' },
  transactions_fee_24h: { id: 'transactions_fee_24h', title: 'Transactions fees', value: '22184.01', description: '', units: '' },
  average_transactions_fee_24h: { id: 'average_transactions_fee_24h', title: 'Avg. transaction fee', value: '0.0123', description: '', units: '' },
};

test.beforeEach(async({ mockTextAd }) => {
  await mockTextAd();
});

test('base view +@dark-mode', async({ render, mockApiResponse }) => {
  await mockApiResponse('general:txs_validated', validatedTxsResponse, { queryParams: { filter: 'validated' } });
  await mockApiResponse('general:txs_stats', txStatsMock.base);
  await mockApiResponse('stats:pages_transactions', txStatsResponse as never);
  await mockApiResponse('general:stats', statsMock.base);

  const component = await render(<Transactions/>, { hooksConfig });
  await expect(component).toHaveScreenshot({ timeout: 20_000 });
});

test.describe('mobile', () => {
  test.use({ viewport: devices['iPhone 13 Pro'].viewport });

  test('base view', async({ render, mockApiResponse }) => {
    await mockApiResponse('general:txs_validated', validatedTxsResponse, { queryParams: { filter: 'validated' } });
    await mockApiResponse('general:txs_stats', txStatsMock.base);
    await mockApiResponse('stats:pages_transactions', txStatsResponse as never);
    await mockApiResponse('general:stats', statsMock.base);

    const component = await render(<Transactions/>, { hooksConfig });
    await expect(component).toHaveScreenshot({ timeout: 20_000 });
  });
});
