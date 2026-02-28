import React from 'react';

import type { HomeStats } from 'types/api/stats';
import type { Transaction } from 'types/api/transaction';

import { route } from 'nextjs-routes';

import useApiQuery from 'lib/api/useApiQuery';
import { formatSethPoolIndexCompact } from 'lib/seth/poolIndex';
import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import { BLOCK } from 'stubs/block';
import { HOMEPAGE_STATS } from 'stubs/stats';
import { TX } from 'stubs/tx';

import { HOME_BLOCKS, HOME_STATS, HOME_TXS } from '../data';
import type { StrictDataState, StrictHomeBlockRow, StrictHomeStatCard, StrictHomeTxRow } from './types';
import { formatAge, formatCompactInteger, formatUsd, formatWeiToEth, getErrorMessage, shortHash } from './utils';

interface StrictHomeData {
  state: StrictDataState;
  stats: Array<StrictHomeStatCard>;
  blocks: Array<StrictHomeBlockRow>;
  txs: Array<StrictHomeTxRow>;
}

type StrictHomeLatestBlockSnapshot = {
  height?: number | string | null;
  pool_index?: number | null;
};

const LIVE_STATS_FALLBACK: Array<StrictHomeStatCard> = [
  {
    label: 'SETH Price',
    value: '--',
    subtext: 'Loading...',
    icon: 'tokens',
    iconColor: '#10b981',
  },
  {
    label: 'Market Cap',
    value: '--',
    subtext: 'Loading...',
    icon: 'globe',
    iconColor: '#10b981',
  },
  {
    label: 'Transactions',
    value: '--',
    subtext: 'Loading...',
    icon: 'transactions',
    iconColor: '#f59e0b',
  },
  {
    label: 'Latest Block',
    value: '--',
    subtext: 'Loading...',
    icon: 'block',
    iconColor: '#a855f7',
  },
];

function mapStats(apiData?: HomeStats, latestBlock?: StrictHomeLatestBlockSnapshot): Array<StrictHomeStatCard> {
  if (!apiData) {
    return LIVE_STATS_FALLBACK;
  }

  const latestBlockHeight = latestBlock?.height !== null && latestBlock?.height !== undefined ?
    String(latestBlock.height) :
    formatIntegerWithFallback(apiData.total_blocks, HOME_STATS[3].value.replace('#', ''));
  const latestBlockSubtext = latestBlock?.pool_index !== null && latestBlock?.pool_index !== undefined ?
    formatSethPoolIndexCompact(latestBlock.pool_index) :
    `${ apiData.average_block_time.toFixed(2) }s avg time`;

  return [
    {
      label: 'SETH Price',
      value: formatUsd(apiData.coin_price, HOME_STATS[0].value),
      subtext: apiData.coin_price_change_percentage !== null ? `${ apiData.coin_price_change_percentage.toFixed(2) }% (24h)` : HOME_STATS[0].subtext,
      icon: 'tokens',
      iconColor: '#10b981',
    },
    {
      label: 'Market Cap',
      value: formatUsd(apiData.market_cap, HOME_STATS[1].value),
      subtext: 'Live',
      icon: 'globe',
      iconColor: '#10b981',
    },
    {
      label: 'Transactions',
      value: formatCompactInteger(apiData.total_transactions, HOME_STATS[2].value),
      subtext: apiData.transactions_today ? `${ formatCompactInteger(apiData.transactions_today) } today` : HOME_STATS[2].subtext,
      icon: 'transactions',
      iconColor: '#f59e0b',
    },
    {
      label: 'Latest Block',
      value: `#${ latestBlockHeight }`,
      subtext: latestBlockSubtext,
      icon: 'block',
      iconColor: '#a855f7',
    },
  ];
}

function formatIntegerWithFallback(value: string | number | null | undefined, fallback: string) {
  const parsed = formatCompactInteger(value, '');
  return parsed || fallback;
}

function mapTxMethodIcon(tx: Transaction): string {
  if (tx.transaction_types.includes('token_transfer')) {
    return 'swap';
  }
  if (tx.transaction_types.includes('contract_creation')) {
    return 'layers';
  }
  return 'file';
}

const STUB_TX_HASHES = [
  '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
  '0x8b2ca91dd8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a612',
  '0x1d4ae2f9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a61239a1c4b2e5d8f9a0c1b3',
  '0x7c3ef1b4f9a0b1c2d3e4f5a61239a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3',
];

export default function useStrictHomeData(): StrictHomeData {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  const statsQuery = useApiQuery('general:stats', {
    queryOptions: {
      enabled: !isStub,
      placeholderData: isStub ? HOMEPAGE_STATS : undefined,
    },
  });
  const blocksQuery = useApiQuery('general:homepage_blocks', {
    queryOptions: {
      enabled: !isStub,
      placeholderData: isStub ? Array(4).fill(BLOCK) : undefined,
    },
  });
  const txsQuery = useApiQuery('general:homepage_txs', {
    queryOptions: {
      enabled: !isStub,
      placeholderData: isStub ? Array(4).fill(TX) : undefined,
    },
  });

  const state: StrictDataState = React.useMemo(() => ({
    mode: dataSource,
    isLoading: isStub ? false : (
      statsQuery.isPlaceholderData || blocksQuery.isPlaceholderData || txsQuery.isPlaceholderData ||
      statsQuery.isPending || blocksQuery.isPending || txsQuery.isPending
    ),
    isError: isStub ? false : (statsQuery.isError || blocksQuery.isError || txsQuery.isError),
    errorMessage: isStub ? undefined : getErrorMessage(statsQuery.error || blocksQuery.error || txsQuery.error),
  }), [
    blocksQuery.error,
    blocksQuery.isError,
    blocksQuery.isPending,
    blocksQuery.isPlaceholderData,
    dataSource,
    isStub,
    statsQuery.error,
    statsQuery.isError,
    statsQuery.isPending,
    statsQuery.isPlaceholderData,
    txsQuery.error,
    txsQuery.isError,
    txsQuery.isPending,
    txsQuery.isPlaceholderData,
  ]);

  const stats = React.useMemo<Array<StrictHomeStatCard>>(() => {
    if (isStub) {
      return HOME_STATS;
    }
    return mapStats(statsQuery.data, blocksQuery.data?.[0]);
  }, [ blocksQuery.data, isStub, statsQuery.data ]);

  const blocks = React.useMemo<Array<StrictHomeBlockRow>>(() => {
    if (isStub) {
      return HOME_BLOCKS.map((item) => ({
        id: item.block,
        block: item.block,
        blockHref: route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: item.block } }),
        age: item.age,
        miner: item.miner,
        txns: item.txns,
      }));
    }

    const blockItems = blocksQuery.isPlaceholderData ? [] : (blocksQuery.data || []).slice(0, 4);

    return blockItems.map((item, index) => ({
      id: `${ item.height ?? 'na' }-${ item.hash ?? 'na' }-${ index }`,
      block: String(item.height),
      blockHref: route({
        pathname: '/block/[height_or_hash]',
        query: {
          height_or_hash: String(item.height),
          ...(item.pool_index !== null && item.pool_index !== undefined ? { pool_index: String(item.pool_index) } : {}),
        },
      }),
      poolLabel: item.pool_index !== null && item.pool_index !== undefined ? formatSethPoolIndexCompact(item.pool_index) : undefined,
      age: formatAge(item.timestamp),
      miner: shortHash(item.miner?.name || item.miner?.hash),
      minerHref: item.miner?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.miner.hash } }) : undefined,
      txns: `${ item.transactions_count } txns`,
    }));
  }, [ isStub, blocksQuery.data, blocksQuery.isPlaceholderData ]);

  const txs = React.useMemo<Array<StrictHomeTxRow>>(() => {
    if (isStub) {
      return HOME_TXS.map((item, index) => {
        const fullHash = STUB_TX_HASHES[index] || STUB_TX_HASHES[0];
        return {
          id: fullHash,
          hash: item.hash,
          txHref: route({ pathname: '/tx/[hash]', query: { hash: fullHash } }),
          age: item.age,
          from: item.from,
          to: item.to,
          value: item.value,
          icon: item.icon,
        };
      });
    }

    const txItems = txsQuery.isPlaceholderData ? [] : (txsQuery.data || []).slice(0, 4);

    return txItems.map((item, index) => ({
      id: `${ item.hash || 'tx' }-${ index }`,
      hash: shortHash(item.hash),
      txHref: route({ pathname: '/tx/[hash]', query: { hash: item.hash } }),
      age: formatAge(item.timestamp),
      from: shortHash(item.from?.name || item.from?.hash),
      fromHref: item.from?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.from.hash } }) : undefined,
      to: shortHash(item.to?.name || item.to?.hash || item.created_contract?.hash),
      toHref: item.to?.hash ?
        route({ pathname: '/address/[hash]', query: { hash: item.to.hash } }) :
        (item.created_contract?.hash ? route({ pathname: '/address/[hash]', query: { hash: item.created_contract.hash } }) : undefined),
      value: formatWeiToEth(item.value),
      icon: mapTxMethodIcon(item),
    }));
  }, [ isStub, txsQuery.data, txsQuery.isPlaceholderData ]);

  return {
    state,
    stats,
    blocks,
    txs,
  };
}
