import { Box } from '@chakra-ui/react';
import React from 'react';

import useIsMobile from 'lib/hooks/useIsMobile';
import { FilterInput } from 'toolkit/components/filters/FilterInput';
import InternalTxsList from 'ui/internalTxs/InternalTxsList';
import InternalTxsTable from 'ui/internalTxs/InternalTxsTable';
import useInternalTxsQuery from 'ui/internalTxs/useInternalTxsQuery';
import ActionBar from 'ui/shared/ActionBar';
import DataListDisplay from 'ui/shared/DataListDisplay';
import ExplorerEmptyState from 'ui/shared/emptyState/ExplorerEmptyState';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';

const InternalTxs = () => {

  const isMobile = useIsMobile();

  const { query, searchTerm, debouncedSearchTerm, onSearchTermChange } = useInternalTxsQuery();
  const { isError, isPlaceholderData, data, pagination } = query;

  const filterInput = (
    <FilterInput
      w={{ base: '100%', lg: '350px' }}
      size="sm"
      onChange={ onSearchTermChange }
      placeholder="Search by transaction hash"
      initialValue={ searchTerm }
    />
  );

  const actionBar = (
    <>
      <Box mb={ 6 } display={{ base: 'flex', lg: 'none' }}>
        { filterInput }
      </Box>
      { (!isMobile || pagination.isVisible) && (
        <ActionBar mt={ -6 }>
          <Box display={{ base: 'none', lg: 'flex' }}>
            { filterInput }
          </Box>
          <Pagination ml="auto" { ...pagination }/>
        </ActionBar>
      ) }
    </>
  );

  const content = data?.items ? (
    <>
      <Box hideFrom="lg">
        <InternalTxsList data={ data.items } isLoading={ isPlaceholderData }/>
      </Box>
      <Box hideBelow="lg">
        <InternalTxsTable data={ data.items } isLoading={ isPlaceholderData }/>
      </Box>
    </>
  ) : null;

  return (
    <>
      <PageTitle
        title="Internal transactions"
        withTextAd
      />
      <DataListDisplay
        isError={ isError }
        itemsNum={ data?.items.length }
        emptyText="There are no internal transactions."
        emptyState={
          <ExplorerEmptyState
            testId="internal-txs-empty-state"
            iconName="transactions"
            title="No internal transactions yet"
            description="Internal transactions appear when contracts call other contracts during execution."
            hint="Indexing in progress can delay this table."
            primaryAction={{ label: 'Browse Latest Blocks', href: '/blocks' }}
          />
        }
        hasActiveFilters={ Boolean(debouncedSearchTerm) }
        emptyStateProps={{
          term: 'internal transaction',
        }}
        actionBar={ actionBar }
      >
        { content }
      </DataListDisplay>
    </>
  );
};

export default InternalTxs;
