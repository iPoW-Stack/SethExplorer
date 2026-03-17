import { Box } from '@chakra-ui/react';
import React from 'react';

import type { TokensSortingValue } from 'types/api/tokens';

import DataFetchAlert from 'ui/shared/DataFetchAlert';
import DataListDisplay from 'ui/shared/DataListDisplay';
import ExplorerEmptyState from 'ui/shared/emptyState/ExplorerEmptyState';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import TokensListItem from './TokensListItem';
import TokensTable from './TokensTable';

interface Props {
  query: QueryWithPagesResult<'general:tokens'> | QueryWithPagesResult<'general:tokens_bridged'> | QueryWithPagesResult<'multichainAggregator:tokens'>;
  onSortChange?: (value: TokensSortingValue) => void;
  sort?: TokensSortingValue;
  actionBar?: React.ReactNode;
  hasActiveFilters: boolean;
  description?: React.ReactNode;
  tableTop?: number;
}

const Tokens = ({ query, onSortChange, sort, actionBar, description, hasActiveFilters, tableTop }: Props) => {

  const { isError, isPlaceholderData, data, pagination } = query;

  if (isError) {
    return <DataFetchAlert/>;
  }

  const content = data?.items ? (
    <>
      <Box hideFrom="lg">
        { description }
        { data.items.map((item, index) => {
          const chainIds = 'chain_infos' in item ? Object.keys(item.chain_infos).join(',') : undefined;

          return (
            <TokensListItem
              key={ item.address_hash + (isPlaceholderData ? index : '') + (chainIds ? chainIds : '') }
              token={ item }
              index={ index }
              page={ pagination.page }
              isLoading={ isPlaceholderData }
            />
          );
        }) }
      </Box>
      <Box hideBelow="lg">
        { description }
        <TokensTable
          items={ data.items }
          page={ pagination.page }
          isLoading={ isPlaceholderData }
          setSorting={ onSortChange }
          sorting={ sort }
          top={ tableTop }
        />
      </Box>
    </>
  ) : null;

  return (
    <DataListDisplay
      isError={ isError }
      itemsNum={ data?.items.length }
      emptyText="There are no tokens."
      emptyState={
          <ExplorerEmptyState
            testId="tokens-empty-state"
            iconName="tokens"
            title="No tokens indexed yet"
          description="Token records will appear here after indexing catches up."
          primaryAction={{ label: 'Browse Latest Blocks', href: '/blocks' }}
        />
      }
      hasActiveFilters={ hasActiveFilters }
      emptyStateProps={{
        term: 'token',
      }}
      actionBar={ query.pagination.isVisible || hasActiveFilters ? actionBar : null }
    >
      { content }
    </DataListDisplay>
  );
};

export default Tokens;
