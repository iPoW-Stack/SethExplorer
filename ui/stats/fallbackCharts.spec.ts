import { describe, expect, test } from 'vitest';

import {
  FALLBACK_DAILY_TX_CHART_ID,
  mapHomeStatsToCounters,
  mapTransactionsChartToLineChart,
} from './fallbackCharts';

describe('mapTransactionsChartToLineChart', () => {
  test('maps and sorts transaction points', () => {
    const result = mapTransactionsChartToLineChart({
      chart_data: [
        { date: '2026-02-11', transactions_count: 21 },
        { date: '2026-02-10', transactions_count: 10 },
      ],
    });

    expect(result?.info?.id).toBe(FALLBACK_DAILY_TX_CHART_ID);
    expect(result?.chart).toEqual([
      {
        date: '2026-02-10T00:00:00.000Z',
        date_to: '2026-02-10T23:59:59.999Z',
        value: '10',
        is_approximate: false,
      },
      {
        date: '2026-02-11T00:00:00.000Z',
        date_to: '2026-02-11T23:59:59.999Z',
        value: '21',
        is_approximate: false,
      },
    ]);
  });
});

describe('mapHomeStatsToCounters', () => {
  test('maps v2 stats payload to fallback counters', () => {
    const counters = mapHomeStatsToCounters({
      total_blocks: '32001',
      total_transactions: '9999',
      total_addresses: '1200',
      average_block_time: 12.45,
      coin_price: null,
      coin_price_change_percentage: null,
      total_gas_used: '0',
      transactions_today: '0',
      gas_used_today: '0',
      gas_prices: null,
      gas_price_updated_at: null,
      gas_prices_update_in: 0,
      static_gas_price: null,
      market_cap: null,
      network_utilization_percentage: 0,
      tvl: null,
    });

    expect(counters?.counters).toHaveLength(4);
    expect(counters?.counters[0]).toMatchObject({ id: 'total_blocks', value: '32001' });
    expect(counters?.counters[3]).toMatchObject({ id: 'average_block_time', units: 's' });
  });
});
