import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import useStrictTransactionDetailData from './useStrictTransactionDetailData';

const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStrictTransactionDetailData', () => {
  test('returns fixture rows in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const result = useStrictTransactionDetailData({ hash: '0xabc' });

    expect(result.state.mode).toBe('stub');
    expect(result.state.isError).toBe(false);
    expect(result.overviewRows.length).toBeGreaterThan(0);
  });

  test('maps live tx query to overview rows and links', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');
    const refetch = vi.fn();

    const txQuery = {
      data: {
        hash: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        status: 'ok',
        block_number: 18249102,
        timestamp: new Date().toISOString(),
        confirmations: 12,
        from: { hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', name: null },
        to: { hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', name: null },
        created_contract: null,
        value: '1000000000000000000',
        fee: { value: '2100000000000000' },
      },
      isPlaceholderData: false,
      isError: false,
      error: undefined,
      refetch,
    } as const;

    const result = useStrictTransactionDetailData({
      txQuery: txQuery as never,
      hash: '0x39a1c4',
    });

    expect(result.state.mode).toBe('live');
    expect(result.state.isError).toBe(false);
    expect(result.overviewRows.find((row) => row.label === 'Status')?.value).toBe('Success');
    expect(result.overviewRows.find((row) => row.label === 'Block')?.href).toContain('/block/18249102');
    expect(result.overviewRows.find((row) => row.label === 'From')?.href).toContain('/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(result.overviewRows.find((row) => row.label === 'To')?.href).toContain('/address/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(result.overviewRows.find((row) => row.label === 'Value')?.value).toContain('ETH');
    expect(result.refetch).toBe(refetch);
  });
});
