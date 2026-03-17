import { Box, chakra, Flex, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import React from 'react';

import { SEARCH_RESULT_TYPES } from 'types/api/search';
import type { SearchResultItem } from 'types/client/search';

import config from 'configs/app';
import { useSettingsContext } from 'lib/contexts/settings';
import getQueryParamString from 'lib/router/getQueryParamString';
import removeQueryParam from 'lib/router/removeQueryParam';
import { Alert } from 'toolkit/chakra/alert';
import { Button } from 'toolkit/chakra/button';
import { Skeleton } from 'toolkit/chakra/skeleton';
import { TableBody, TableColumnHeader, TableHeaderSticky, TableRoot, TableRow } from 'toolkit/chakra/table';
import { ContentLoader } from 'toolkit/components/loaders/ContentLoader';
import * as regexp from 'toolkit/utils/regexp';
import useMarketplaceApps from 'ui/marketplace/useMarketplaceApps';
import SearchResultListItem from 'ui/searchResults/SearchResultListItem';
import SearchResultsInput from 'ui/searchResults/SearchResultsInput';
import SearchResultTableItem from 'ui/searchResults/SearchResultTableItem';
import ActionBar, { ACTION_BAR_HEIGHT_DESKTOP } from 'ui/shared/ActionBar';
import AppErrorBoundary from 'ui/shared/AppError/AppErrorBoundary';
import DataFetchAlert from 'ui/shared/DataFetchAlert';
import ExplorerEmptyState from 'ui/shared/emptyState/ExplorerEmptyState';
import * as Layout from 'ui/shared/layout/components';
import PageTitle from 'ui/shared/Page/PageTitle';
import Pagination from 'ui/shared/pagination/Pagination';
import ExternalSearchItem from 'ui/shared/search/ExternalSearchItem';
import type { SearchResultAppItem } from 'ui/shared/search/utils';
import HeaderAlert from 'ui/snippets/header/HeaderAlert';
import HeaderDesktop from 'ui/snippets/header/HeaderDesktop';
import HeaderMobile from 'ui/snippets/header/HeaderMobile';
import SearchBarSuggestBlockCountdown from 'ui/snippets/searchBar/SearchBarSuggest/SearchBarSuggestBlockCountdown';
import useSearchQuery from 'ui/snippets/searchBar/useSearchQuery';

const nameServicesFeature = config.features.nameServices;

const SearchResultsPageContent = () => {
  const router = useRouter();
  const withRedirectCheck = getQueryParamString(router.query.redirect) === 'true';
  const {
    query,
    redirectCheckQuery,
    searchTerm,
    debouncedSearchTerm,
    handleSearchTermChange,
    zetaChainCCTXQuery,
    externalSearchItem,
  } = useSearchQuery(withRedirectCheck);
  const { data, isError, isPlaceholderData, pagination } = query;
  const [ showContent, setShowContent ] = React.useState(!withRedirectCheck);
  const [ isLoadingStuck, setIsLoadingStuck ] = React.useState(false);
  const [ isRedirectCheckStuck, setIsRedirectCheckStuck ] = React.useState(false);
  const isRedirectCheckPending = withRedirectCheck && !showContent && redirectCheckQuery.isPending;

  const marketplaceApps = useMarketplaceApps(debouncedSearchTerm);
  const settingsContext = useSettingsContext();
  const isLoading = marketplaceApps.isPlaceholderData || isPlaceholderData;

  const handleNavigateToResults = React.useCallback((searchTerm: string) => {
    handleSearchTermChange(searchTerm);
  }, [ handleSearchTermChange ]);

  React.useEffect(() => {
    if (showContent) {
      return;
    }

    if (!debouncedSearchTerm) {
      setShowContent(true);
      return;
    }

    if (redirectCheckQuery.data?.redirect && redirectCheckQuery.data.parameter) {
      switch (redirectCheckQuery.data.type) {
        case 'block': {
          router.replace({ pathname: '/block/[height_or_hash]', query: { height_or_hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'address': {
          router.replace({ pathname: '/address/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'transaction': {
          router.replace({ pathname: '/tx/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
          return;
        }
        case 'user_operation': {
          if (config.features.userOps.isEnabled) {
            router.replace({ pathname: '/op/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
            return;
          }
          break;
        }
        case 'blob': {
          if (config.features.dataAvailability.isEnabled) {
            router.replace({ pathname: '/blobs/[hash]', query: { hash: redirectCheckQuery.data.parameter } });
            return;
          }
          break;
        }
        case 'ens_domain': {
          const feature = config.features.nameServices;
          if (feature.isEnabled && feature.ens.isEnabled) {
            router.replace({ pathname: '/name-services/domains/[name]', query: { name: redirectCheckQuery.data.parameter } });
            return;
          }
          break;
        }
      }
    }

    if (!redirectCheckQuery.isPending) {
      setShowContent(true);
      removeQueryParam(router, 'redirect');
    }
  }, [ redirectCheckQuery, router, debouncedSearchTerm, showContent ]);

  React.useEffect(() => {
    if (!isLoading) {
      setIsLoadingStuck(false);
      return;
    }

    setIsLoadingStuck(false);
    const timeout = window.setTimeout(() => {
      setIsLoadingStuck(true);
    }, 15_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [ isLoading ]);

  React.useEffect(() => {
    if (!isRedirectCheckPending) {
      setIsRedirectCheckStuck(false);
      return;
    }

    setIsRedirectCheckStuck(false);
    const timeout = window.setTimeout(() => {
      setIsRedirectCheckStuck(true);
    }, 12_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [ isRedirectCheckPending ]);

  const handleSubmit = React.useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, [ ]);

  const handleRetry = React.useCallback(() => {
    redirectCheckQuery.refetch();
    query.refetch();
    zetaChainCCTXQuery.refetch();
    marketplaceApps.refetch();
  }, [ marketplaceApps, query, redirectCheckQuery, zetaChainCCTXQuery ]);

  const handleShowResults = React.useCallback(() => {
    setShowContent(true);
    removeQueryParam(router, 'redirect');
  }, [ router ]);

  const displayedItems: Array<SearchResultItem | SearchResultAppItem> = React.useMemo(() => {
    const apiData = (data?.items || []).filter((item) => {
      if (!SEARCH_RESULT_TYPES[item.type]) {
        return false;
      }
      if (!config.features.userOps.isEnabled && item.type === 'user_operation') {
        return false;
      }
      if (!config.features.dataAvailability.isEnabled && item.type === 'blob') {
        return false;
      }
      if ((!nameServicesFeature.isEnabled || !nameServicesFeature.ens.isEnabled) && item.type === 'ens_domain') {
        return false;
      }
      if (!config.features.tac.isEnabled && item.type === 'tac_operation') {
        return false;
      }
      return true;
    });

    const futureBlockItem = !isPlaceholderData &&
      pagination.page === 1 &&
      !data?.next_page_params &&
      apiData.length > 0 &&
      !apiData.some(({ type }) => type === 'block') &&
      regexp.BLOCK_HEIGHT.test(debouncedSearchTerm) ?
      {
        type: 'block' as const,
        block_type: 'block' as const,
        block_number: debouncedSearchTerm,
        block_hash: '',
        timestamp: undefined,
      } : undefined;

    return [
      ...(pagination.page === 1 && !isLoading ? marketplaceApps.displayedApps.map((item) => ({ type: 'app' as const, app: item })) : []),
      ...(
        config.features.zetachain.isEnabled &&
        pagination.page === 1 &&
        !isLoading &&
        zetaChainCCTXQuery.data ?
          zetaChainCCTXQuery.data.items.map((item) => ({ type: 'zetaChainCCTX' as const, cctx: item })) : []),
      futureBlockItem,
      ...apiData,
    ].filter(Boolean);
  }, [
    data?.items,
    data?.next_page_params,
    isPlaceholderData,
    pagination.page,
    debouncedSearchTerm,
    marketplaceApps.displayedApps,
    isLoading,
    zetaChainCCTXQuery.data,
  ]);

  const content = (() => {
    if (isError) {
      return <DataFetchAlert/>;
    }

    if (!displayedItems.length) {
      if (isLoading) {
        return null;
      }

      return (
        <Flex>
          <ExplorerEmptyState
            testId="search-results-empty-state"
            iconName="search"
            title="No matching results found"
            description="Try a full address (0x...), transaction hash, or block number."
            primaryAction={{ label: 'Browse Latest Blocks', href: '/blocks' }}
            secondaryAction={{ label: 'View Transactions', href: '/txs', variant: 'outline' }}
          />
        </Flex>
      );
    }

    return (
      <>
        <Box hideFrom="lg">
          { displayedItems.map((item, index) => (
            <SearchResultListItem
              key={ (isLoading ? 'placeholder_' : 'actual_') + index }
              data={ item }
              searchTerm={ debouncedSearchTerm }
              isLoading={ isLoading }
              addressFormat={ settingsContext?.addressFormat }
            />
          )) }
        </Box>
        <Box hideBelow="lg">
          <TableRoot fontWeight={ 500 }>
            <TableHeaderSticky top={ pagination.isVisible ? ACTION_BAR_HEIGHT_DESKTOP : 0 }>
              <TableRow>
                <TableColumnHeader width="30%">Search result</TableColumnHeader>
                <TableColumnHeader width="35%"/>
                <TableColumnHeader width="35%" pr={ 10 }/>
                <TableColumnHeader width="150px">Category</TableColumnHeader>
              </TableRow>
            </TableHeaderSticky>
            <TableBody>
              { displayedItems.map((item, index) => (
                <SearchResultTableItem
                  key={ (isLoading ? 'placeholder_' : 'actual_') + index }
                  data={ item }
                  searchTerm={ debouncedSearchTerm }
                  isLoading={ isLoading }
                  addressFormat={ settingsContext?.addressFormat }
                />
              )) }
            </TableBody>
          </TableRoot>
        </Box>
      </>
    );
  })();

  const bar = (() => {
    if (isError) {
      return null;
    }

    const resultsCount = pagination.page === 1 && !data?.next_page_params ? displayedItems.length : '50+';

    const text = (() => {
      if (isLoading && pagination.page === 1) {
        return <Skeleton loading h={ 6 } w="280px" borderRadius="full" mb={ pagination.isVisible ? 0 : 6 }/>;
      }

      if (resultsCount === 0 && externalSearchItem) {
        return <ExternalSearchItem item={ externalSearchItem }/>;
      }

      return (
        <>
          <Box mb={ pagination.isVisible ? 0 : 6 } lineHeight="32px">
            <span>Found </span>
            <chakra.span fontWeight={ 700 }>
              { resultsCount }
            </chakra.span>
            <span> matching result{ (((displayedItems.length || 0) + marketplaceApps.displayedApps.length) > 1) || pagination.page > 1 ? 's' : '' } for </span>
            <chakra.span fontWeight={ 700 }>"{ debouncedSearchTerm }"</chakra.span>
          </Box>
          { resultsCount === 0 && regexp.BLOCK_HEIGHT.test(debouncedSearchTerm) &&
            <SearchBarSuggestBlockCountdown blockHeight={ debouncedSearchTerm } mt={ -4 }/> }
        </>
      );
    })();

    if (!pagination.isVisible) {
      return text;
    }

    return (
      <>
        <Box hideFrom="lg">{ text }</Box>
        <ActionBar mt={{ base: 0, lg: -6 }} alignItems="center">
          <Box hideBelow="lg">{ text }</Box>
          <Pagination { ...pagination }/>
        </ActionBar>
      </>
    );
  })();

  const renderSearchBar = React.useCallback(() => {
    return (
      <SearchResultsInput
        searchTerm={ searchTerm }
        handleSubmit={ handleSubmit }
        handleSearchTermChange={ handleSearchTermChange }
      />
    );
  }, [ handleSearchTermChange, handleSubmit, searchTerm ]);

  const loadingAlert = (isLoadingStuck || isRedirectCheckStuck) ? (
    <Alert status="warning" mb={ 6 }>
      <Flex alignItems="center" justifyContent="space-between" width="100%" gap={ 4 }>
        <Text fontSize="sm">
          { isRedirectCheckStuck ?
            'Redirect check is taking longer than expected. You can open results directly or retry.' :
            'Search is taking longer than expected. Please retry.' }
        </Text>
        <Flex gap={ 2 }>
          { isRedirectCheckStuck && (
            <Button size="xs" variant="subtle" onClick={ handleShowResults }>Show results</Button>
          ) }
          <Button size="xs" variant="subtle" onClick={ handleRetry }>Retry</Button>
        </Flex>
      </Flex>
    </Alert>
  ) : null;

  const pageContent = (
    <>
      <PageTitle title="Search results"/>
      { loadingAlert }
      { !showContent ? <ContentLoader/> : (
        <>
          { bar }
          { content }
        </>
      ) }
    </>
  );

  return (
    <>
      <HeaderMobile onGoToSearchResults={ handleNavigateToResults }/>
      <Layout.MainArea>
        <Layout.SideBar/>
        <Layout.MainColumn>
          <HeaderAlert/>
          <HeaderDesktop renderSearchBar={ renderSearchBar }/>
          <AppErrorBoundary>
            <Layout.Content flexGrow={ 0 }>
              { pageContent }
            </Layout.Content>
          </AppErrorBoundary>
        </Layout.MainColumn>
      </Layout.MainArea>
      <Layout.Footer/>
    </>
  );
};

export default React.memo(SearchResultsPageContent);
