import { Grid } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import { isStatsServiceEnabled } from 'lib/settings/useSethStrict';
import { STATS_COUNTER } from 'stubs/stats';
import StatsWidget from 'ui/shared/stats/StatsWidget';

import DataFetchAlert from '../shared/DataFetchAlert';
import { mapHomeStatsToCounters } from './fallbackCharts';

const UNITS_WITHOUT_SPACE = ['s'];
const COUNTERS_REFRESH_INTERVAL_MS = 20_000;

const NumberWidgetsList = () => {
  const statsServiceEnabled = isStatsServiceEnabled();
  const countersQuery = useApiQuery('stats:counters', {
    queryOptions: {
      enabled: statsServiceEnabled,
      placeholderData: { counters: Array(10).fill(STATS_COUNTER) },
      refetchInterval: COUNTERS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    },
  });
  const fallbackStatsQuery = useApiQuery('general:stats', {
    queryOptions: {
      enabled: !statsServiceEnabled || countersQuery.isError,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: COUNTERS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      retry: 1,
    },
  });

  const fallbackCounters = mapHomeStatsToCounters(fallbackStatsQuery.data);
  const isFallbackMode = !statsServiceEnabled || (countersQuery.isError && Boolean(fallbackCounters));
  const data = isFallbackMode ? fallbackCounters : countersQuery.data;
  const isPlaceholderData = statsServiceEnabled ?
    (countersQuery.isPlaceholderData || (countersQuery.isError && fallbackStatsQuery.isPlaceholderData)) :
    fallbackStatsQuery.isPlaceholderData;
  const isError = statsServiceEnabled ?
    (countersQuery.isError && !isFallbackMode && fallbackStatsQuery.isError) :
    !fallbackCounters && fallbackStatsQuery.isError;

  if (isError) {
    return <DataFetchAlert />;
  }

  return (
    <Grid
      gridTemplateColumns={{ base: 'repeat(2, 50%)', lg: 'repeat(4, 25%)' }}
      gridGap={{ base: 1, lg: 2 }}
    >
      {
        data?.counters?.map(({ id, title, value, units, description }, index) => {

          let unitsStr = '';
          if (units && UNITS_WITHOUT_SPACE.includes(units)) {
            unitsStr = units;
          } else if (units) {
            unitsStr = ' ' + units;
          }

          const valueNum = Number(value);
          const maximumFractionDigits = valueNum < 1 ? 6 : (valueNum < 100 ? 3 : 0);
          const formattedValue = valueNum.toLocaleString('en-US', {
            maximumFractionDigits,
            minimumFractionDigits: valueNum > 0 && valueNum < 1 ? 2 : 0,
            useGrouping: true,
          });

          return (
            <StatsWidget
              key={id + (isPlaceholderData ? index : '')}
              label={title}
              value={formattedValue}
              valuePostfix={unitsStr}
              isLoading={isPlaceholderData}
              hint={description}
            />
          );
        })
      }
    </Grid>
  );
};

export default NumberWidgetsList;
