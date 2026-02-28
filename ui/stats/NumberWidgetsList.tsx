import { Grid } from '@chakra-ui/react';
import React from 'react';

import useApiQuery from 'lib/api/useApiQuery';
import { STATS_COUNTER } from 'stubs/stats';
import StatsWidget from 'ui/shared/stats/StatsWidget';

import DataFetchAlert from '../shared/DataFetchAlert';
import { mapHomeStatsToCounters } from './fallbackCharts';

const UNITS_WITHOUT_SPACE = [ 's' ];
const COUNTERS_REFRESH_INTERVAL_MS = 20_000;

const NumberWidgetsList = () => {
  const countersQuery = useApiQuery('stats:counters', {
    queryOptions: {
      placeholderData: { counters: Array(10).fill(STATS_COUNTER) },
      refetchInterval: COUNTERS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
    },
  });
  const fallbackStatsQuery = useApiQuery('general:stats', {
    queryOptions: {
      enabled: countersQuery.isError,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: COUNTERS_REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      retry: 1,
    },
  });

  const fallbackCounters = mapHomeStatsToCounters(fallbackStatsQuery.data);
  const isFallbackMode = countersQuery.isError && Boolean(fallbackCounters);
  const data = isFallbackMode ? fallbackCounters : countersQuery.data;
  const isPlaceholderData = countersQuery.isPlaceholderData || (countersQuery.isError && fallbackStatsQuery.isPlaceholderData);
  const isError = countersQuery.isError && !isFallbackMode && fallbackStatsQuery.isError;

  if (isError) {
    return <DataFetchAlert/>;
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
          const maximumFractionDigits = valueNum < 10 ** -3 ? undefined : 3;

          return (
            <StatsWidget
              key={ id + (isPlaceholderData ? index : '') }
              label={ title }
              value={ Number(value).toLocaleString(undefined, { maximumFractionDigits, notation: 'compact' }) }
              valuePostfix={ unitsStr }
              isLoading={ isPlaceholderData }
              hint={ description }
            />
          );
        })
      }
    </Grid>
  );
};

export default NumberWidgetsList;
