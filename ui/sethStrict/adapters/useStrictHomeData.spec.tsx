// @vitest-environment jsdom

import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest/lib';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

vi.mock('lib/api/useApiQuery', () => ({
  default: vi.fn(),
}));

import useApiQuery from 'lib/api/useApiQuery';
import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import useStrictHomeData from './useStrictHomeData';

const mockUseApiQuery = useApiQuery as unknown as Mock<typeof useApiQuery>;
const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseApiQuery.mockReturnValue({
    data: undefined,
    isPlaceholderData: false,
    isError: false,
    error: undefined,
  } as never);
});

describe('useStrictHomeData', () => {
  test('returns fixture-based data in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const { result } = renderHook(() => useStrictHomeData());

    expect(result.current.state.mode).toBe('stub');
    expect(result.current.state.isError).toBe(false);
    expect(result.current.blocks.length).toBeGreaterThan(0);
    expect(result.current.blocks[0].blockHref).toContain('/block/');
    expect(result.current.txs[0].txHref).toContain('/tx/');
  });

  test('maps live API data in live mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');

    mockUseApiQuery.mockImplementation((resourceName: unknown) => {
      if (resourceName === 'general:stats') {
        return {
          data: {
            coin_price: '1234.56',
            coin_price_change_percentage: 1.23,
            market_cap: '987654321',
            total_transactions: '1500000',
            transactions_today: '12345',
            total_blocks: '18249102',
            average_block_time: 3.2,
          },
          isPlaceholderData: false,
          isError: false,
          error: undefined,
        } as never;
      }

      if (resourceName === 'general:homepage_blocks') {
        return {
          data: [ {
            height: 18249102,
            timestamp: new Date().toISOString(),
            transactions_count: 142,
            miner: { hash: '0x1234567890abcdef1234567890abcdef12345678', name: null },
          } ],
          isPlaceholderData: false,
          isError: false,
          error: undefined,
        } as never;
      }

      if (resourceName === 'general:homepage_txs') {
        return {
          data: [ {
            hash: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
            timestamp: new Date().toISOString(),
            from: { hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: null },
            to: { hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: null },
            created_contract: null,
            value: '1000000000000000000',
            transaction_types: [ 'coin_transfer' ],
          } ],
          isPlaceholderData: false,
          isError: false,
          error: undefined,
        } as never;
      }

      return {
        data: undefined,
        isPlaceholderData: false,
        isError: false,
        error: undefined,
      } as never;
    });

    const { result } = renderHook(() => useStrictHomeData());

    expect(result.current.state.mode).toBe('live');
    expect(result.current.state.isError).toBe(false);
    expect(result.current.stats[0].label).toBe('SETH Price');
    expect(result.current.blocks[0].blockHref).toContain('/block/18249102');
    expect(result.current.txs[0].txHref).toContain('/tx/');
  });
});

