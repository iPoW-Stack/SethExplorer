import React from 'react';

import { route } from 'nextjs-routes';

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';

import { TXS_TABLE_ROWS } from '../data';
import type { StrictPageAdapterResult, StrictTxsRow } from './types';
import { formatAge, formatWeiToEth, getErrorMessage, shortHash } from './utils';

interface Params {
  query?: QueryWithPagesResult<'general:txs_validated'>;
}

function getMethodTone(method?: string | null): 'green' | 'gray' {
  if (!method) {
    return 'gray';
  }

  const normalized = method.toLowerCase();
  if (normalized.includes('swap') || normalized.includes('mint') || normalized.includes('execute')) {
    return 'green';
  }

  return 'gray';
}

function getMethodName(method?: string | null, txTypes?: Array<string>) {
  if (method) {
    return method;
  }

  if (txTypes?.length) {
    return txTypes[0].replaceAll('_', ' ');
  }

  return 'transfer';
}

export default function useStrictTransactionsData({ query }: Params): StrictPageAdapterResult<StrictTxsRow> {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  if (isStub) {
    return {
      mode: 'stub',
      isLoading: false,
      isError: false,
      rows: TXS_TABLE_ROWS.map((item) => ({
        id: item.hash,
        hash: item.hash,
        txHref: route({ pathname: '/tx/[hash]', query: { hash: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6' } }),
        method: item.method,
        methodTone: item.methodTone as 'green' | 'gray',
        block: item.block,
        blockHref: route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: item.block } }),
        age: item.age,
        from: item.from,
        to: item.to,
        value: item.value,
      })),
      totalLabel: 'Total of 1.5M+ transactions found',
      pagination: {
        pageLabel: 'Page 1 of 2760',
        pageSizeLabel: '25',
        canGoNext: false,
        canGoPrev: false,
      },
    };
  }

  if (!query) {
    return {
      mode: 'live',
      isLoading: false,
      isError: true,
      errorMessage: 'Missing transactions query for strict live mode',
      rows: [],
      pagination: {
        pageLabel: 'Page -',
        pageSizeLabel: '25',
        canGoNext: false,
        canGoPrev: false,
      },
    };
  }

  const rows = (query.data?.items || []).map((item) => {
    const method = getMethodName(item.method, item.transaction_types);
    return {
      id: item.hash,
      hash: shortHash(item.hash),
      txHref: route({ pathname: '/tx/[hash]', query: { hash: item.hash } }),
      method,
      methodTone: getMethodTone(method),
      block: String(item.block_number ?? '-'),
      blockHref: item.block_number !== null ? route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: String(item.block_number) } }) : undefined,
      age: formatAge(item.timestamp),
      from: shortHash(item.from?.name || item.from?.hash),
      fromHref: item.from?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.from.hash } }) : undefined,
      to: shortHash(item.to?.name || item.to?.hash || item.created_contract?.hash),
      toHref: item.to?.hash ?
        route({ pathname: '/address/[hash]', query: { hash: item.to.hash } }) :
        (item.created_contract?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.created_contract.hash } }) : undefined),
      value: formatWeiToEth(item.value),
    };
  });

  return {
    mode: 'live',
    isLoading: query.isPlaceholderData,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error) : undefined,
    rows,
    totalLabel: rows.length ? `Showing ${ rows.length } validated transactions` : 'No transactions found',
    refetch: query.refetch,
    pagination: {
      pageLabel: `Page ${ query.pagination.page }`,
      pageSizeLabel: '25',
      canGoPrev: query.pagination.canGoBackwards && !query.pagination.isLoading,
      canGoNext: query.pagination.hasNextPage && !query.pagination.isLoading,
      onPrev: query.pagination.onPrevPageClick,
      onNext: query.pagination.onNextPageClick,
    },
  };
}

