import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import useStrictTransactionsData from './useStrictTransactionsData';

const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStrictTransactionsData', () => {
  test('returns fixture rows in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const result = useStrictTransactionsData({});

    expect(result.mode).toBe('stub');
    expect(result.isError).toBe(false);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].txHref).toContain('/tx/');
    expect(result.rows[0].blockHref).toContain('/block/');
  });

  test('maps live transactions and uses pagination callbacks', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');
    const onPrevPageClick = vi.fn();
    const onNextPageClick = vi.fn();
    const refetch = vi.fn();

    const query = {
      data: {
        items: [
          {
            hash: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
            method: 'swapExactETHForTokens',
            transaction_types: [ 'coin_transfer' ],
            block_number: 18249102,
            timestamp: new Date().toISOString(),
            from: { hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: null },
            to: { hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: null },
            created_contract: null,
            value: '1000000000000000000',
          },
        ],
      },
      isPlaceholderData: false,
      isError: false,
      error: undefined,
      refetch,
      pagination: {
        page: 2,
        canGoBackwards: true,
        hasNextPage: true,
        isLoading: false,
        onPrevPageClick,
        onNextPageClick,
      },
    } as const;

    const result = useStrictTransactionsData({ query: query as never });

    expect(result.mode).toBe('live');
    expect(result.isError).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].txHref).toContain('/tx/');
    expect(result.rows[0].blockHref).toContain('/block/18249102');
    expect(result.rows[0].methodTone).toBe('green');
    expect(result.rows[0].fromHref).toContain('/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(result.rows[0].toHref).toContain('/address/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(result.pagination?.canGoPrev).toBe(true);
    expect(result.pagination?.canGoNext).toBe(true);
    result.pagination?.onPrev?.();
    result.pagination?.onNext?.();
    expect(onPrevPageClick).toHaveBeenCalledTimes(1);
    expect(onNextPageClick).toHaveBeenCalledTimes(1);
    expect(result.refetch).toBe(refetch);
  });
});
