import BigNumber from 'bignumber.js';
import React from 'react';

import { route } from 'nextjs-routes';

import { formatSethPoolIndexCompact } from 'lib/seth/poolIndex';
import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import type { QueryWithPagesResult } from 'ui/shared/pagination/useQueryWithPages';
import { WEI } from 'ui/shared/value/utils';

import { BLOCKS_TABLE_ROWS } from '../data';
import type { StrictBlocksRow, StrictPageAdapterResult } from './types';
import { calcPercent, formatAge, formatInteger, formatWeiToEth, gasColorByPercent, getErrorMessage, shortHash } from './utils';

interface Params {
  query?: QueryWithPagesResult<'general:blocks'>;
}

function buildRewardLabel(reward?: string | null, rewards?: Array<{ reward: string }>) {
  if (reward) {
    return formatWeiToEth(reward, '-');
  }

  if (rewards?.length) {
    const sum = rewards.reduce((acc, item) => acc.plus(item.reward || '0'), new BigNumber(0));
    return `${ sum.div(WEI).dp(4).toFormat() } ETH`;
  }

  return '-';
}

function buildGasLabel(gasUsed?: string | null, gasLimit?: string | null, percent?: number) {
  if (!gasUsed) {
    return '-';
  }

  const gasUsedNumber = Number(gasUsed);
  const displayUsed = Number.isFinite(gasUsedNumber) ? `${ formatInteger(gasUsedNumber) }` : gasUsed;

  const resolvedPercent = percent ?? calcPercent(gasUsed, gasLimit);
  if (!resolvedPercent) {
    return displayUsed;
  }

  return `${ displayUsed } (${ resolvedPercent }%)`;
}

export default function useStrictBlocksData({ query }: Params): StrictPageAdapterResult<StrictBlocksRow> {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  if (isStub) {
    return {
      mode: 'stub',
      isLoading: false,
      isError: false,
      rows: BLOCKS_TABLE_ROWS.map((item) => ({
        id: item.block,
        block: item.block,
        blockHref: route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: item.block } }),
        age: item.age,
        txns: item.txns,
        miner: item.miner,
        gasUsed: item.gasUsed,
        gasProgress: item.gasProgress,
        gasColor: item.gasColor,
        reward: item.reward,
      })),
      totalLabel: 'Total of 18,249,102 blocks',
      pagination: {
        pageLabel: 'Page 1 of 1000+',
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
      errorMessage: 'Missing blocks query for strict live mode',
      rows: [],
      pagination: {
        pageLabel: 'Page -',
        pageSizeLabel: '25',
        canGoNext: false,
        canGoPrev: false,
      },
    };
  }

  const items = query.isPlaceholderData ? [] : (query.data?.items || []);

  const rows = items.map((item) => {
    const gasProgress = calcPercent(item.gas_used, item.gas_limit);
    const blockNumber = String(item.height);
    const poolLabel = item.pool_index !== null && item.pool_index !== undefined ? formatSethPoolIndexCompact(item.pool_index) : undefined;
    const blockQuery = {
      height_or_hash: blockNumber,
      ...(item.pool_index !== null && item.pool_index !== undefined ? { pool_index: String(item.pool_index) } : {}),
    };

    return {
      id: item.hash || `${ item.height ?? 'na' }-${ item.pool_index ?? 'na' }`,
      block: blockNumber,
      blockHref: route({ pathname: '/block/[height_or_hash]', query: blockQuery }),
      poolLabel,
      age: formatAge(item.timestamp),
      txns: String(item.transactions_count),
      miner: shortHash(item.miner?.name || item.miner?.hash),
      minerHref: item.miner?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.miner.hash } }) : undefined,
      gasUsed: buildGasLabel(item.gas_used, item.gas_limit, gasProgress),
      gasProgress,
      gasColor: gasColorByPercent(gasProgress),
      reward: buildRewardLabel(item.transaction_fees, item.rewards),
    };
  });

  const firstLiveBlock = query.data?.items?.[0]?.height;
  const hasRows = rows.length > 0;

  return {
    mode: 'live',
    isLoading: query.isPlaceholderData || query.isPending || query.isLoading,
    isError: query.isError,
    errorMessage: query.isError ? getErrorMessage(query.error) : undefined,
    rows,
    totalLabel: firstLiveBlock !== undefined ? `Latest block #${ firstLiveBlock }` : (hasRows ? `Latest block #${ rows[0].block }` : 'No blocks found'),
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
