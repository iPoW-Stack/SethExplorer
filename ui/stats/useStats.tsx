import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';

import type * as stats from '@blockscout/stats-types';
import type { StatsIntervalIds } from 'types/client/stats';
import type { ExternalChainExtended } from 'types/externalChains';

import useApiQuery from 'lib/api/useApiQuery';
import getQueryParamString from 'lib/router/getQueryParamString';
import { STATS_CHARTS } from 'stubs/stats';

import { getFallbackLineCharts } from './fallbackCharts';

const STATS_REFRESH_INTERVAL_MS = 20_000;

function isSectionMatches(section: stats.LineChartSection, currentSection: string): boolean {
  return currentSection === 'all' || section.id === currentSection;
}

function isChartNameMatches(q: string, chart: stats.LineChartInfo) {
  return chart.title.toLowerCase().includes(q.toLowerCase());
}

interface Props {
  chain?: ExternalChainExtended;
}

export default function useStats({ chain }: Props = {}) {
  const router = useRouter();

  const linesQuery = useApiQuery('stats:lines', {
    queryOptions: {
      placeholderData: STATS_CHARTS,
      refetchInterval: STATS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    },
    chain,
  });
  const fallbackDailyTxsQuery = useApiQuery('general:stats_charts_txs', {
    queryOptions: {
      enabled: linesQuery.isError,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: STATS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      retry: 1,
    },
    chain,
  });

  const isFallbackMode = linesQuery.isError;
  const data = isFallbackMode ? getFallbackLineCharts() : linesQuery.data;
  const isError = linesQuery.isError && fallbackDailyTxsQuery.isError;
  const isPlaceholderData = linesQuery.isPlaceholderData || (linesQuery.isError && fallbackDailyTxsQuery.isPlaceholderData);

  const [ currentSection, setCurrentSection ] = useState('all');
  const [ filterQuery, setFilterQuery ] = useState('');
  const [ initialFilterQuery, setInitialFilterQuery ] = React.useState('');
  const [ interval, setInterval ] = useState<StatsIntervalIds>('oneMonth');
  const sectionIds = useMemo(() => data?.sections?.map(({ id }) => id), [ data ]);

  React.useEffect(() => {
    if (!isPlaceholderData && !isError) {
      const chartId = getQueryParamString(router.query.chartId);
      const chartName = data?.sections.map((section) => section.charts.find((chart) => chart.id === chartId)).filter(Boolean)[0]?.title;
      if (chartName) {
        setInitialFilterQuery(chartName);
        setFilterQuery(chartName);
        router.replace({ pathname: '/stats' }, undefined, { scroll: false });
      }
    }
  // run only when data is loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ isPlaceholderData ]);

  const displayedCharts = React.useMemo(() => {
    return data?.sections
      ?.map((section) => {
        const charts = section.charts.filter((chart) => isSectionMatches(section, currentSection) && isChartNameMatches(filterQuery, chart));

        return {
          ...section,
          charts,
        };
      }).filter((section) => section.charts.length > 0);
  }, [ currentSection, data?.sections, filterQuery ]);

  const handleSectionChange = useCallback((newSection: string) => {
    setCurrentSection(newSection);
  }, []);

  const handleIntervalChange = useCallback((newInterval: StatsIntervalIds) => {
    setInterval(newInterval);
  }, []);

  const handleFilterChange = useCallback((q: string) => {
    setFilterQuery(q);
  }, []);

  return React.useMemo(() => ({
    sections: data?.sections,
    sectionIds,
    isPlaceholderData,
    isError,
    initialFilterQuery,
    filterQuery,
    currentSection,
    handleSectionChange,
    interval,
    handleIntervalChange,
    handleFilterChange,
    displayedCharts,
    isFallbackMode,
  }), [
    data,
    sectionIds,
    isPlaceholderData,
    isError,
    initialFilterQuery,
    filterQuery,
    currentSection,
    handleSectionChange,
    interval,
    handleIntervalChange,
    handleFilterChange,
    displayedCharts,
    isFallbackMode,
  ]);
}
