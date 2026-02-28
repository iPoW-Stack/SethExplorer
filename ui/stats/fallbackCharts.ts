import type * as stats from '@blockscout/stats-types';
import type { ChartTransactionResponse } from 'types/api/charts';
import type { HomeStats } from 'types/api/stats';

const DAY_START_SUFFIX = 'T00:00:00.000Z';
const DAY_END_SUFFIX = 'T23:59:59.999Z';

export const FALLBACK_DAILY_TX_CHART_ID = 'daily_txs';

export const FALLBACK_DAILY_TX_CHART_INFO: stats.LineChartInfo = {
  id: FALLBACK_DAILY_TX_CHART_ID,
  title: 'Daily transactions',
  description: 'Daily transaction count sourced from the core explorer API',
  units: undefined,
  resolutions: [ 'DAY', 'WEEK', 'MONTH', 'YEAR' ],
};

export const FALLBACK_CHARTS_SECTION: stats.LineChartSection = {
  id: 'activity',
  title: 'Network activity',
  charts: [ FALLBACK_DAILY_TX_CHART_INFO ],
};

export function getFallbackLineCharts(): stats.LineCharts {
  return {
    sections: [ FALLBACK_CHARTS_SECTION ],
  };
}

export function mapTransactionsChartToLineChart(data?: ChartTransactionResponse): stats.LineChart | undefined {
  if (!data) {
    return;
  }

  const points = [ ...(data.chart_data || []) ]
    .filter((item) => Boolean(item.date))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((item) => ({
      date: `${ item.date }${ DAY_START_SUFFIX }`,
      date_to: `${ item.date }${ DAY_END_SUFFIX }`,
      value: String(item.transactions_count ?? 0),
      is_approximate: false,
    }));

  return {
    info: FALLBACK_DAILY_TX_CHART_INFO,
    chart: points,
  };
}

export function mapHomeStatsToCounters(data?: HomeStats): stats.Counters | undefined {
  if (!data) {
    return;
  }

  const counters: stats.Counters['counters'] = [
    {
      id: 'total_blocks',
      title: 'Total blocks',
      value: String(data.total_blocks || '0'),
      description: 'Latest indexed blocks',
      units: undefined,
    },
    {
      id: 'total_transactions',
      title: 'Total transactions',
      value: String(data.total_transactions || '0'),
      description: 'All indexed transactions',
      units: undefined,
    },
    {
      id: 'total_addresses',
      title: 'Total addresses',
      value: String(data.total_addresses || '0'),
      description: 'Unique addresses observed on-chain',
      units: undefined,
    },
    {
      id: 'average_block_time',
      title: 'Average block time',
      value: String(Number(data.average_block_time || 0).toFixed(2)),
      description: 'Average time between blocks',
      units: 's',
    },
  ];

  return { counters };
}
