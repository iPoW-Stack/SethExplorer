// @vitest-environment jsdom

import useApiQuery from 'lib/api/useApiQuery';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest/lib';

import useLiveHeadQuery from './useLiveHeadQuery';

vi.mock('lib/settings/useSethStrict', () => ({
  isSethLiveHeadEnabled: vi.fn(() => true),
  getSethLiveHeadPollMs: vi.fn(() => 10_000),
}));

vi.mock('lib/api/useApiQuery', () => ({
  'default': vi.fn(),
}));

const mockUseApiQuery = useApiQuery as unknown as Mock<typeof useApiQuery>;

function getBaseQueryResult() {
  return {
    data: undefined,
    isError: false,
    isPending: false,
    isPlaceholderData: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe('useLiveHeadQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns live-head payload when endpoint is available', () => {
    mockUseApiQuery.mockImplementation((resourceName: unknown) => {
      if (resourceName === 'general:seth_live_head') {
        return {
          ...getBaseQueryResult(),
          data: {
            generated_at: '2026-02-28T00:00:00.000Z',
            source_state: 'ok',
            global_head: {
              height: 120,
              timestamp: '2026-02-28T00:00:00.000Z',
              source: 'rpc',
            },
            indexer_head: {
              height: 100,
              timestamp: '2026-02-28T00:00:00.000Z',
              source: 'indexer',
            },
            lag: {
              blocks: 20,
              seconds: 60,
            },
            shards: [],
          },
        } as never;
      }

      return getBaseQueryResult() as never;
    });

    const { result } = renderHook(() => useLiveHeadQuery({
      enabled: true,
      indexerHeight: 100,
      indexerTimestamp: '2026-02-28T00:00:00.000Z',
    }));

    expect(result.current.source).toBe('live-head');
    expect(result.current.data?.global_head.height).toBe(120);
    expect(result.current.isError).toBe(false);
  });

  test('falls back to block number when live-head endpoint fails and block number is ahead', () => {
    mockUseApiQuery.mockImplementation((resourceName: unknown) => {
      if (resourceName === 'general:seth_live_head') {
        return {
          ...getBaseQueryResult(),
          isError: true,
          error: { status: 400, statusText: 'Bad Request' },
        } as never;
      }

      if (resourceName === 'general:stats') {
        return {
          ...getBaseQueryResult(),
          data: {
            total_blocks: '100',
            total_addresses: '10',
            total_transactions: '200',
            average_block_time: 1,
            coin_price: null,
            coin_price_change_percentage: null,
            total_gas_used: '0',
            transactions_today: null,
            gas_used_today: '0',
            gas_prices: null,
            gas_price_updated_at: null,
            gas_prices_update_in: 0,
            static_gas_price: null,
            market_cap: null,
            network_utilization_percentage: 0,
            tvl: null,
            seth_shards: [ {
              name: 'shard3',
              network: 3,
              pool_count: 32,
              indexed_pools: 32,
              latest_height: 100,
              latest_block_timestamp: '2026-02-28T00:00:00.000Z',
              source_state: 'ok',
              pools: [],
            } ],
          },
        } as never;
      }

      if (resourceName === 'general:seth_block_number') {
        return {
          ...getBaseQueryResult(),
          data: {
            jsonrpc: '2.0',
            id: 1,
            result: '0x70',
          },
        } as never;
      }

      return getBaseQueryResult() as never;
    });

    const { result } = renderHook(() => useLiveHeadQuery({
      enabled: true,
      indexerHeight: 100,
      indexerTimestamp: '2026-02-28T00:00:00.000Z',
    }));

    expect(result.current.source).toBe('block-number-fallback');
    expect(result.current.data?.global_head.height).toBe(112);
    expect(result.current.data?.lag.blocks).toBe(12);
    expect(result.current.isError).toBe(false);
  });
});
