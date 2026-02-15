// @vitest-environment jsdom

import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest/lib';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

vi.mock('ui/address/useAddressTxsQuery', () => ({
  default: vi.fn(),
}));

vi.mock('lib/api/useApiQuery', () => ({
  default: vi.fn(),
}));

import useApiQuery from 'lib/api/useApiQuery';
import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import useAddressTxsQuery from 'ui/address/useAddressTxsQuery';

import useStrictAddressData from './useStrictAddressData';

const mockUseApiQuery = useApiQuery as unknown as Mock<typeof useApiQuery>;
const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;
const mockUseAddressTxsQuery = useAddressTxsQuery as unknown as Mock<typeof useAddressTxsQuery>;

beforeEach(() => {
  vi.clearAllMocks();

  mockUseAddressTxsQuery.mockReturnValue({
    query: {
      data: { items: [] },
      isPlaceholderData: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
      pagination: {
        page: 1,
        canGoBackwards: false,
        hasNextPage: false,
        isLoading: false,
        onPrevPageClick: vi.fn(),
        onNextPageClick: vi.fn(),
      },
    },
  } as never);

  mockUseApiQuery.mockReturnValue({
    data: undefined,
    isPlaceholderData: false,
    isError: false,
    error: undefined,
  } as never);
});

describe('useStrictAddressData', () => {
  test('returns fixture rows in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const { result } = renderHook(() => useStrictAddressData({
      hash: '0x1234567890abcdef1234567890abcdef12345678',
    }));

    expect(result.current.state.mode).toBe('stub');
    expect(result.current.state.isError).toBe(false);
    expect(result.current.txRows.length).toBeGreaterThan(0);
    expect(result.current.txRows[0].txHref).toContain('/tx/');
  });

  test('maps live queries and exposes pagination handlers', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');
    const onPrevPageClick = vi.fn();
    const onNextPageClick = vi.fn();
    const refetch = vi.fn();

    mockUseAddressTxsQuery.mockReturnValue({
      query: {
        data: {
          items: [
            {
              hash: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
              method: 'transfer',
              transaction_types: [ 'coin_transfer' ],
              block_number: 18249102,
              timestamp: new Date().toISOString(),
              from: { hash: '0x1234567890abcdef1234567890abcdef12345678', name: null },
              to: { hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: null },
              created_contract: null,
              value: '1000000000000000000',
              fee: { value: '2100000000000000' },
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
      },
    } as never);

    mockUseApiQuery.mockImplementation((resourceName: unknown) => {
      if (resourceName === 'general:address_tabs_counters') {
        return {
          data: { token_balances_count: 3 },
          isPlaceholderData: false,
          isError: false,
          error: undefined,
        } as never;
      }

      if (resourceName === 'general:address_tokens') {
        return {
          data: {
            items: [
              {
                value: '12,500',
                token: { symbol: 'USDC' },
              },
            ],
          },
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

    const { result } = renderHook(() => useStrictAddressData({
      hash: '0x1234567890abcdef1234567890abcdef12345678',
      addressQuery: {
        data: {
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          name: null,
          coin_balance: '1000000000000000000',
          exchange_rate: '1800',
        },
        isPlaceholderData: false,
        isError: false,
        error: undefined,
      } as never,
    }));

    expect(result.current.state.mode).toBe('live');
    expect(result.current.state.isError).toBe(false);
    expect(result.current.balanceLabel).toContain('ETH');
    expect(result.current.holdingsLabel).toContain('3 token balances');
    expect(result.current.holdingsHintLabel).toContain('USDC');
    expect(result.current.txRows).toHaveLength(1);
    expect(result.current.txRows[0].txHref).toContain('/tx/');
    expect(result.current.txRows[0].fromYou).toBe(true);
    expect(result.current.pagination?.canGoPrev).toBe(true);
    expect(result.current.pagination?.canGoNext).toBe(true);
    result.current.pagination?.onPrev?.();
    result.current.pagination?.onNext?.();
    expect(onPrevPageClick).toHaveBeenCalledTimes(1);
    expect(onNextPageClick).toHaveBeenCalledTimes(1);
  });
});
