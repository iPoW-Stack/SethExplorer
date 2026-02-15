import type { Mock } from 'vitest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('lib/settings/useSethStrict', () => ({
  getSethStrictDataSource: vi.fn(),
}));

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import useStrictBlockDetailData from './useStrictBlockDetailData';

const mockGetSethStrictDataSource = getSethStrictDataSource as unknown as Mock<typeof getSethStrictDataSource>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useStrictBlockDetailData', () => {
  test('returns fixture overview in stub mode', () => {
    mockGetSethStrictDataSource.mockReturnValue('stub');

    const result = useStrictBlockDetailData({ heightOrHash: '18249102' });

    expect(result.state.mode).toBe('stub');
    expect(result.state.isError).toBe(false);
    expect(result.blockHeight).toBe('18249102');
    expect(result.overviewRows.length).toBeGreaterThan(0);
    expect(result.gasRows.length).toBeGreaterThan(0);
  });

  test('maps live block query to strict overview rows', () => {
    mockGetSethStrictDataSource.mockReturnValue('live');
    const refetch = vi.fn();

    const blockQuery = {
      data: {
        height: 18249102,
        hash: '0xabc123',
        timestamp: new Date().toISOString(),
        transactions_count: 142,
        internal_transactions_count: 12,
        miner: { hash: '0x1234567890abcdef1234567890abcdef12345678', name: null },
        transaction_fees: '2000000000000000000',
        total_difficulty: '123456',
        size: 99999,
        gas_used: '15000000',
        gas_used_percentage: 50,
        gas_limit: '30000000',
        base_fee_per_gas: '25000000000',
        burnt_fees: '100000000000000000',
      },
      isPlaceholderData: false,
      isError: false,
      error: undefined,
      refetch,
    } as const;

    const result = useStrictBlockDetailData({
      blockQuery: blockQuery as never,
      heightOrHash: '18249102',
    });

    expect(result.state.mode).toBe('live');
    expect(result.state.isError).toBe(false);
    expect(result.blockHeight).toBe('18249102');
    expect(result.minedByHref).toContain('/address/0x1234567890abcdef1234567890abcdef12345678');
    expect(result.overviewRows.find((row) => row.label === 'Block Height')?.href).toContain('/block/18249102');
    expect(result.overviewRows.find((row) => row.label === 'Transactions')?.value).toContain('transactions');
    expect(result.gasRows.find((row) => row.label === 'Gas Used')?.accent).toContain('50.00%');
    expect(result.refetch).toBe(refetch);
  });
});
