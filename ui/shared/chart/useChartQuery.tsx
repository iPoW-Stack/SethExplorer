import React from 'react';

import type { LineChart, Resolution } from '@blockscout/stats-types';
import type { StatsIntervalIds } from 'types/client/stats';

import type { ResourceError } from 'lib/api/resources';
import useApiQuery from 'lib/api/useApiQuery';
import { useAppContext } from 'lib/contexts/app';
import { STATS_INTERVALS } from 'ui/stats/constants';
import {
  FALLBACK_DAILY_TX_CHART_ID,
  mapTransactionsChartToLineChart,
} from 'ui/stats/fallbackCharts';

import { formatDate } from './utils';

export default function useChartQuery(id: string, resolution: Resolution, interval: StatsIntervalIds, enabled = true) {
  const { apiData } = useAppContext<'/stats/[id]'>();

  const selectedInterval = STATS_INTERVALS[interval];

  const endDate = selectedInterval.start ? formatDate(new Date()) : undefined;
  const startDate = selectedInterval.start ? formatDate(selectedInterval.start) : undefined;

  const [ info, setInfo ] = React.useState<LineChart['info']>(apiData || undefined);

  const lineQuery = useApiQuery('stats:line', {
    pathParams: { id },
    queryParams: {
      from: startDate,
      to: endDate,
      resolution,
    },
    queryOptions: {
      enabled: enabled,
      refetchOnMount: false,
      placeholderData: {
        info: {
          title: 'Chart title placeholder',
          description: 'Chart placeholder description chart placeholder description',
          resolutions: [ 'DAY', 'WEEK', 'MONTH', 'YEAR' ],
          id: 'placeholder',
          units: undefined,
        },
        chart: [],
      },
    },
  });
  const fallbackDailyTxsQuery = useApiQuery('general:stats_charts_txs', {
    queryOptions: {
      enabled: enabled && id === FALLBACK_DAILY_TX_CHART_ID && lineQuery.isError,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  });

  const fallbackData = mapTransactionsChartToLineChart(fallbackDailyTxsQuery.data);
  const isFallbackDataActive = lineQuery.isError && Boolean(fallbackData);
  const data = isFallbackDataActive ? fallbackData : lineQuery.data;
  const isError = lineQuery.isError && !isFallbackDataActive;
  const isPlaceholderData = lineQuery.isPlaceholderData || (lineQuery.isError && fallbackDailyTxsQuery.isPlaceholderData);
  const isPending = lineQuery.isPending || (lineQuery.isError && fallbackDailyTxsQuery.isPending);
  const error = (lineQuery.error || fallbackDailyTxsQuery.error) as ResourceError | null;

  React.useEffect(() => {
    if (!info && data?.info && !isPlaceholderData) {
      // save info to keep title and description when change query params
      setInfo(data?.info);
    }
  }, [ data?.info, info, isPlaceholderData ]);

  const items = React.useMemo(() => data?.chart?.map((item) => {
    return { date: new Date(item.date), date_to: new Date(item.date_to), value: Number(item.value), isApproximate: item.is_approximate };
  }), [ data?.chart ]);

  return {
    items,
    info,
    data,
    error,
    isError,
    isPending,
    isPlaceholderData,
    isFallbackDataActive,
    lineQuery,
  };
}
