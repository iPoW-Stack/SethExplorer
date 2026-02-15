import React from 'react';

import * as txMock from 'mocks/txs/tx';
import { test, expect, devices } from 'playwright/lib';

import Transaction from './Transaction';

const hash = txMock.base.hash;
const hooksConfig = {
  router: {
    query: { hash },
    isReady: true,
  },
};

const emptyPaginated = { items: [], next_page_params: null };
const emptyStateChanges = { items: [], next_page_params: { items_count: 0, state_changes: null } };

test.beforeEach(async({ mockTextAd }) => {
  await mockTextAd();
});

test('base view +@dark-mode', async({ render, mockApiResponse }) => {
  await mockApiResponse('general:tx', txMock.base, { pathParams: { hash } });
  await mockApiResponse('general:tx_token_transfers', emptyPaginated, { pathParams: { hash } });
  await mockApiResponse('general:tx_internal_txs', emptyPaginated, { pathParams: { hash } });
  await mockApiResponse('general:tx_logs', emptyPaginated, { pathParams: { hash } });
  await mockApiResponse('general:tx_state_changes', emptyStateChanges, { pathParams: { hash } });
  await mockApiResponse('general:tx_raw_trace', [], { pathParams: { hash } });
  await mockApiResponse('general:tx_external_transactions', [], { pathParams: { hash } });
  await mockApiResponse('general:tx_interpretation', { data: { summaries: [] } }, { pathParams: { hash } });

  const component = await render(<Transaction/>, { hooksConfig });
  await expect(component).toHaveScreenshot({ timeout: 20_000 });
});

test.describe('mobile', () => {
  test.use({ viewport: devices['iPhone 13 Pro'].viewport });

  test('base view', async({ render, mockApiResponse }) => {
    await mockApiResponse('general:tx', txMock.base, { pathParams: { hash } });
    await mockApiResponse('general:tx_token_transfers', emptyPaginated, { pathParams: { hash } });
    await mockApiResponse('general:tx_internal_txs', emptyPaginated, { pathParams: { hash } });
    await mockApiResponse('general:tx_logs', emptyPaginated, { pathParams: { hash } });
    await mockApiResponse('general:tx_state_changes', emptyStateChanges, { pathParams: { hash } });
    await mockApiResponse('general:tx_raw_trace', [], { pathParams: { hash } });
    await mockApiResponse('general:tx_external_transactions', [], { pathParams: { hash } });
    await mockApiResponse('general:tx_interpretation', { data: { summaries: [] } }, { pathParams: { hash } });

    const component = await render(<Transaction/>, { hooksConfig });
    await expect(component).toHaveScreenshot({ timeout: 20_000 });
  });
});
