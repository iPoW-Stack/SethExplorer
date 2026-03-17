import React from 'react';

import type { LineChart, Resolution } from '@blockscout/stats-types';
import type { StatsIntervalIds } from 'types/client/stats';

import type { ResourceError } from 'lib/api/resources';
import useApiQuery from 'lib/api/useApiQuery';
import { useAppContext } from 'lib/contexts/app';
import { isStatsServiceEnabled } from 'lib/settings/useSethStrict';
import { STATS_INTERVALS } from 'ui/stats/constants';
import {
  FALLBACK_DAILY_TX_CHART_ID,
  mapTransactionsChartToLineChart,
} from 'ui/stats/fallbackCharts';

import { formatDate } from './utils';

const CHART_LIVE_REFRESH_MS = 15_000;

export default function useChartQuery(id: string, resolution: Resolution, interval: StatsIntervalIds, enabled = true) {
  const { apiData } = useAppContext<'/stats/[id]'>();

  const selectedInterval = STATS_INTERVALS[interval];
  const statsServiceEnabled = isStatsServiceEnabled();

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
      enabled: enabled && Boolean(id) && statsServiceEnabled,
      refetchOnMount: false,
      refetchInterval: enabled ? CHART_LIVE_REFRESH_MS : false,
      refetchIntervalInBackground: true,
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
      enabled: enabled && Boolean(id) && id === FALLBACK_DAILY_TX_CHART_ID && (!statsServiceEnabled || lineQuery.isError),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: enabled ? CHART_LIVE_REFRESH_MS : false,
      refetchIntervalInBackground: true,
      retry: 1,
    },
  });

  const fallbackData = mapTransactionsChartToLineChart(fallbackDailyTxsQuery.data);
  const isFallbackCandidate = id === FALLBACK_DAILY_TX_CHART_ID;
  const isFallbackPending = (lineQuery.isError || !statsServiceEnabled) && isFallbackCandidate &&
    (fallbackDailyTxsQuery.isPending || fallbackDailyTxsQuery.isFetching || fallbackDailyTxsQuery.fetchStatus === 'fetching');
  const isFallbackDataActive = (lineQuery.isError || !statsServiceEnabled) && Boolean(fallbackData);
  const data = isFallbackDataActive ? fallbackData : lineQuery.data;
  const isError = statsServiceEnabled ?
    (lineQuery.isError && !isFallbackDataActive && !isFallbackPending) :
    (!isFallbackDataActive && fallbackDailyTxsQuery.isError);
  const isPlaceholderData = statsServiceEnabled ?
    (lineQuery.isPlaceholderData || (lineQuery.isError && fallbackDailyTxsQuery.isPlaceholderData)) :
    (isFallbackCandidate && fallbackDailyTxsQuery.isPlaceholderData);
  const isPending = statsServiceEnabled ? (lineQuery.isPending || isFallbackPending) : isFallbackPending;
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
