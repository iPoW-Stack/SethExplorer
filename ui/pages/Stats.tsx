import { Box, Flex, Text } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useEtherscanRedirects from 'lib/router/useEtherscanRedirects';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import PageTitle from 'ui/shared/Page/PageTitle';

import ChartsWidgetsList from '../stats/ChartsWidgetsList';
import NumberWidgetsList from '../stats/NumberWidgetsList';
import StatsFilters from '../stats/StatsFilters';
import useStats from '../stats/useStats';

const Stats = () => {
  const {
    isPlaceholderData,
    isError,
    sections,
    currentSection,
    handleSectionChange,
    interval,
    handleIntervalChange,
    handleFilterChange,
    displayedCharts,
    initialFilterQuery,
  } = useStats();
  const [ isLoadingStuck, setIsLoadingStuck ] = React.useState(false);

  React.useEffect(() => {
    if (!isPlaceholderData) {
      setIsLoadingStuck(false);
      return;
    }

    setIsLoadingStuck(false);
    const timeout = window.setTimeout(() => {
      setIsLoadingStuck(true);
    }, 20_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [ isPlaceholderData ]);

  const handleRetry = React.useCallback(() => {
    window.location.reload();
  }, []);

  useEtherscanRedirects();

  return (
    <>
      <PageTitle
        title={ config.meta.seo.enhancedDataEnabled ? `${ config.chain.name } statistic & data` : `${ config.chain.name } stats` }
      />
      {(isError || isLoadingStuck) && (
        <Alert status="warning" mb={{ base: 6, sm: 8 }}>
          <Flex alignItems="center" justifyContent="space-between" width="100%" gap={ 4 }>
            <Text>
              { isError ?
                'Statistics failed to load. Please retry.' :
                'Statistics are taking longer than expected. You can retry now.' }
            </Text>
            <Button size="xs" variant="subtle" onClick={ handleRetry }>Retry</Button>
          </Flex>
        </Alert>
      )}

      <Box mb={{ base: 6, sm: 8 }}>
        <NumberWidgetsList/>
      </Box>

      <Box mb={{ base: 6, sm: 8 }}>
        <StatsFilters
          isLoading={ isPlaceholderData }
          initialFilterValue={ initialFilterQuery }
          sections={ sections }
          currentSection={ currentSection }
          onSectionChange={ handleSectionChange }
          interval={ interval }
          onIntervalChange={ handleIntervalChange }
          onFilterInputChange={ handleFilterChange }
        />
      </Box>

      <ChartsWidgetsList
        initialFilterQuery={ initialFilterQuery }
        isError={ isError }
        isPlaceholderData={ isPlaceholderData }
        charts={ displayedCharts }
        interval={ interval }
        sections={ sections }
        selectedSectionId={ currentSection }
      />
    </>
  );
};

export default Stats;
