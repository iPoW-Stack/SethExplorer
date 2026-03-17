import { Box, createListCollection, HStack } from '@chakra-ui/react';
import React from 'react';

import config from 'configs/app';
import useApiQuery from 'lib/api/useApiQuery';
import useIsMobile from 'lib/hooks/useIsMobile';
import { FilterInput } from 'toolkit/components/filters/FilterInput';
import ActionBar from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import ExplorerEmptyState from 'ui/shared/emptyState/ExplorerEmptyState';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import Sort from 'ui/shared/sort/Sort';
import useVerifiedContractsQuery from 'ui/verifiedContracts/useVerifiedContractsQuery';
import { SORT_OPTIONS } from 'ui/verifiedContracts/utils';
import VerifiedContractsCounters from 'ui/verifiedContracts/VerifiedContractsCounters';
import VerifiedContractsFilter from 'ui/verifiedContracts/VerifiedContractsFilter';
import VerifiedContractsList from 'ui/verifiedContracts/VerifiedContractsList';
import VerifiedContractsTable from 'ui/verifiedContracts/VerifiedContractsTable';

const sortCollection = createListCollection({
  items: SORT_OPTIONS,
});

const VerifiedContracts = () => {
  const isMobile = useIsMobile();
  const isStatsFeatureEnabled = config.features.stats.isEnabled;

  const { query, type, searchTerm, debouncedSearchTerm, sort, onSearchTermChange, onTypeChange, onSortChange } = useVerifiedContractsQuery();
  const { isError, isPlaceholderData, data, pagination } = query;

  const countersStatsQuery = useApiQuery('stats:pages_contracts', {
    queryOptions: {
      enabled: isStatsFeatureEnabled,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  });
  const countersApiQuery = useApiQuery('general:verified_contracts_counters', {
    queryOptions: {
      enabled: !isStatsFeatureEnabled,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  });

  const verifiedCount = isStatsFeatureEnabled ?
    Number(countersStatsQuery.data?.total_verified_contracts?.value || 0) :
    Number(countersApiQuery.data?.verified_smart_contracts || 0);
  const shouldShowIndexingState = !isError &&
    !isPlaceholderData &&
    !debouncedSearchTerm &&
    !type &&
    (data?.items?.length || 0) === 0 &&
    verifiedCount > 0;

  const emptyState = shouldShowIndexingState ? (
    <ExplorerEmptyState
      testId="verified-contracts-indexing-state"
      iconName="contracts/verified"
      title="Verified contracts are still syncing"
      description="Counters are already available, but the list is still being indexed. Please refresh shortly."
      primaryAction={{ label: 'Retry', href: '/verified-contracts' }}
    />
  ) : (
    <ExplorerEmptyState
      testId="verified-contracts-empty-state"
      iconName="contracts/regular"
      title="No verified contracts yet"
      description="Verified contracts will appear here once contract indexing is complete."
      primaryAction={{ label: 'Verify Contract', href: '/contract-verification' }}
      secondaryAction={{ label: 'Browse Latest Blocks', href: '/blocks', variant: 'outline' }}
    />
  );

  const typeFilter = (
    <VerifiedContractsFilter
      onChange={ onTypeChange }
      defaultValue={ type }
      hasActiveFilter={ Boolean(type) }
    />
  );

  const filterInput = (
    <FilterInput
      w={{ base: '100%', lg: '350px' }}
      size="sm"
      onChange={ onSearchTermChange }
      placeholder="Search by contract name or address"
      initialValue={ searchTerm }
    />
  );

  const sortButton = (
    <Sort
      name="verified_contracts_sorting"
      defaultValue={ [ sort ] }
      collection={ sortCollection }
      onValueChange={ onSortChange }
      isLoading={ isPlaceholderData }
    />
  );

  const actionBar = (
    <>
      <HStack gap={ 3 } mb={ 6 } display={{ base: 'flex', lg: 'none' }}>
        { typeFilter }
        { sortButton }
        { filterInput }
      </HStack>
      { (!isMobile || pagination.isVisible) && (
        <ActionBar mt={ -6 }>
          <HStack gap={ 3 } display={{ base: 'none', lg: 'flex' }}>
            { typeFilter }
            { filterInput }
          </HStack>
          <Pagination ml="auto" { ...pagination }/>
        </ActionBar>
      ) }
    </>
  );

  const content = data?.items ? (
    <>
      <Box hideFrom="lg">
        <VerifiedContractsList data={ data.items } isLoading={ isPlaceholderData }/>
      </Box>
      <Box hideBelow="lg">
        <VerifiedContractsTable data={ data.items } sort={ sort } setSorting={ onSortChange } isLoading={ isPlaceholderData }/>
      </Box>
    </>
  ) : null;

  return (
    <Box>
      <PageTitle
        title={ config.meta.seo.enhancedDataEnabled ? `Verified ${ config.chain.name } contracts` : 'Verified contracts' }
        withTextAd
      />
      <VerifiedContractsCounters/>
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText={ shouldShowIndexingState ? 'Syncing verified contracts list...' : 'There are no verified contracts.' }
        emptyState={ emptyState }
        hasActiveFilters={ Boolean(debouncedSearchTerm || type) }
        emptyStateProps={{
          term: 'contract',
        }}
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </Box>
  );
};

export default VerifiedContracts;
