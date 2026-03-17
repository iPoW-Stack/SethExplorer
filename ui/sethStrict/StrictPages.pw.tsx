import React from 'react';

import { test, expect } from 'playwright/lib';

import StrictBlocksPage from './StrictBlocksPage';
import StrictHome from './StrictHome';
import StrictTransactionsPage from './StrictTransactionsPage';

test('strict home has wired View All links', async({ render, mockEnvs }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SETH_STRICT_MODE', 'true' ],
    [ 'NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE', 'stub' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_ENABLED', 'false' ],
  ]);

  const component = await render(<StrictHome/>);

  await expect(component.getByTestId('strict-home-view-all-blocks')).toHaveAttribute('href', '/blocks');
  await expect(component.getByTestId('strict-home-view-all-txs')).toHaveAttribute('href', '/txs');
});

test('strict blocks page keeps row links and pagination controls enabled in live mode', async({ render, mockEnvs }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SETH_STRICT_MODE', 'true' ],
    [ 'NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE', 'live' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_ENABLED', 'false' ],
  ]);

  const query = {
    data: {
      items: [
        {
          height: 18249102,
          hash: '0xabc123',
          timestamp: new Date().toISOString(),
          transactions_count: 142,
          miner: { hash: '0x1234567890abcdef1234567890abcdef12345678', name: null },
          gas_used: '15000000',
          gas_limit: '30000000',
          transaction_fees: '1000000000000000000',
          rewards: [ { reward: '500000000000000000' } ],
        },
      ],
    },
    isPlaceholderData: false,
    isError: false,
    error: undefined,
    refetch: () => undefined,
    pagination: {
      page: 2,
      canGoBackwards: true,
      hasNextPage: true,
      isLoading: false,
      onPrevPageClick: () => undefined,
      onNextPageClick: () => undefined,
    },
  };

  const component = await render(<StrictBlocksPage query={ query as never }/>);

  await expect(component.getByTestId('strict-blocks-row-block-link').first()).toHaveAttribute('href', /\/block\/18249102/);
  await expect(component.getByTestId('strict-blocks-prev-page')).toHaveAttribute('aria-disabled', 'false');
  await expect(component.getByTestId('strict-blocks-next-page')).toHaveAttribute('aria-disabled', 'false');
});

test('strict transactions page surfaces explicit error state', async({ render, mockEnvs }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SETH_STRICT_MODE', 'true' ],
    [ 'NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE', 'live' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_ENABLED', 'false' ],
  ]);

  const query = {
    data: { items: [] },
    isPlaceholderData: false,
    isError: true,
    error: { status: 500, statusText: 'Internal Server Error' },
    refetch: () => undefined,
    pagination: {
      page: 1,
      canGoBackwards: false,
      hasNextPage: false,
      isLoading: false,
      onPrevPageClick: () => undefined,
      onNextPageClick: () => undefined,
    },
  };

  const component = await render(<StrictTransactionsPage query={ query as never }/>);

  await expect(component.getByText(/500/)).toBeVisible();
  await expect(component.getByTestId('strict-txs-prev-page')).toHaveAttribute('aria-disabled', 'true');
  await expect(component.getByTestId('strict-txs-next-page')).toHaveAttribute('aria-disabled', 'true');
});

test('strict blocks page switches to live head label when indexer lags', async({ render, mockEnvs, mockApiResponse }) => {
  await mockEnvs([
    [ 'NEXT_PUBLIC_SETH_STRICT_MODE', 'true' ],
    [ 'NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE', 'live' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_ENABLED', 'true' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_SWITCH_BLOCKS', '3' ],
    [ 'NEXT_PUBLIC_LIVE_HEAD_SWITCH_SECONDS', '90' ],
  ]);

  await mockApiResponse('general:seth_live_head', {
    generated_at: '2026-02-28T00:00:00.000Z',
    source_state: 'ok',
    global_head: {
      height: 200,
      timestamp: '2026-02-28T00:00:00.000Z',
      source: 'rpc',
    },
    indexer_head: {
      height: 190,
      timestamp: '2026-02-27T23:57:00.000Z',
      source: 'indexer',
    },
    lag: {
      blocks: 10,
      seconds: 180,
    },
    shards: [],
  });

  const query = {
    data: {
      items: [ {
        height: 190,
        hash: '0xabc123',
        timestamp: new Date().toISOString(),
        transactions_count: 42,
        miner: { hash: '0x1234567890abcdef1234567890abcdef12345678', name: null },
        gas_used: '15000000',
        gas_limit: '30000000',
        transaction_fees: '1000000000000000000',
        rewards: [],
      } ],
    },
    isPlaceholderData: false,
    isError: false,
    error: undefined,
    refetch: () => undefined,
    pagination: {
      page: 1,
      canGoBackwards: false,
      hasNextPage: false,
      isLoading: false,
      onPrevPageClick: () => undefined,
      onNextPageClick: () => undefined,
    },
  };

  const component = await render(<StrictBlocksPage query={ query as never }/>);

  await expect(component.getByTestId('strict-blocks-live-head-status')).toContainText('Live (RPC)');
  await expect(component).toContainText('Latest block #200');
});
