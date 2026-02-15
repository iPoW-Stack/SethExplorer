import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import useStrictBlocksData from './useStrictBlocksData';

const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStrictBlocksData', () => {
  test('returns fixture rows in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const result = useStrictBlocksData({});

    expect(result.mode).toBe('stub');
    expect(result.isError).toBe(false);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].blockHref).toContain('/block/');
    expect(result.pagination?.canGoPrev).toBe(false);
    expect(result.pagination?.canGoNext).toBe(false);
  });

  test('maps live query data and wires pagination callbacks', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');
    const onPrevPageClick = vi.fn();
    const onNextPageClick = vi.fn();
    const refetch = vi.fn();

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
      refetch,
      pagination: {
        page: 3,
        canGoBackwards: true,
        hasNextPage: true,
        isLoading: false,
        onPrevPageClick,
        onNextPageClick,
      },
    } as const;

    const result = useStrictBlocksData({ query: query as never });

    expect(result.mode).toBe('live');
    expect(result.isError).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].block).toBe('18249102');
    expect(result.rows[0].blockHref).toContain('/block/18249102');
    expect(result.rows[0].minerHref).toContain('/address/0x1234567890abcdef1234567890abcdef12345678');
    expect(result.rows[0].gasProgress).toBe(50);
    expect(result.pagination?.canGoPrev).toBe(true);
    expect(result.pagination?.canGoNext).toBe(true);
    result.pagination?.onPrev?.();
    result.pagination?.onNext?.();
    expect(onPrevPageClick).toHaveBeenCalledTimes(1);
    expect(onNextPageClick).toHaveBeenCalledTimes(1);
    expect(result.refetch).toBe(refetch);
  });
});
