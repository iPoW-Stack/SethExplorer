import React from 'react';

import { route } from 'nextjs-routes';

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import type { BlockQuery } from 'ui/block/useBlockQuery';

import { BLOCK_GAS_ROWS, BLOCK_OVERVIEW_ROWS } from '../data';
import type { StrictBlockGasRow, StrictBlockOverviewRow, StrictDataState } from './types';
import { formatAge, formatDateTime, formatInteger, formatWeiToEth, getErrorMessage, shortHash } from './utils';

interface Params {
  blockQuery?: BlockQuery;
  heightOrHash?: string;
}

interface StrictBlockDetailData {
  state: StrictDataState;
  title: string;
  blockHeight: string;
  minedBy: string;
  minedByHref?: string;
  minedAgo: string;
  overviewRows: Array<StrictBlockOverviewRow>;
  gasRows: Array<StrictBlockGasRow>;
  refetch?: () => void;
}

export default function useStrictBlockDetailData({ blockQuery, heightOrHash }: Params): StrictBlockDetailData {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  if (isStub) {
    return {
      state: {
        mode: 'stub',
        isLoading: false,
        isError: false,
      },
      title: 'Block',
      blockHeight: '18249102',
      minedBy: '0x82...9a12',
      minedAgo: '12 secs ago',
      overviewRows: BLOCK_OVERVIEW_ROWS,
      gasRows: BLOCK_GAS_ROWS,
    };
  }

  if (!blockQuery) {
    return {
      state: {
        mode: 'live',
        isLoading: false,
        isError: true,
        errorMessage: 'Missing block query for strict live mode',
      },
      title: 'Block',
      blockHeight: heightOrHash || '-',
      minedBy: '-',
      minedAgo: '-',
      overviewRows: [],
      gasRows: [],
    };
  }

  const block = blockQuery.data;
  const minedByHash = block?.miner?.hash;
  const blockHeight = block?.height !== undefined ? String(block.height) : (heightOrHash || '-');
  const minedAgo = block?.timestamp ? formatAge(block.timestamp) : '-';
  const timestampDetail = block?.timestamp ? formatDateTime(block.timestamp) : '-';
  const txCount = block?.transactions_count !== undefined ? `${ formatInteger(block.transactions_count) } transactions` : '-';
  const intTxCount = block?.internal_transactions_count !== undefined ? formatInteger(block.internal_transactions_count) : '0';

  const overviewRows: Array<StrictBlockOverviewRow> = [
    {
      label: 'Block Height',
      value: blockHeight,
      href: block?.height !== undefined ? route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: blockHeight } }) : undefined,
      copyValue: block?.hash || undefined,
    },
    {
      label: 'Timestamp',
      value: `${ minedAgo } (${ timestampDetail })`,
    },
    {
      label: 'Transactions',
      value: `${ txCount } and ${ intTxCount } internal transactions in this block`,
      accent: true,
    },
    {
      label: 'Fee Recipient',
      value: shortHash(block?.miner?.name || minedByHash),
      href: minedByHash ? route({ pathname: '/address/[hash]', query: { hash: minedByHash } }) : undefined,
      copyValue: minedByHash || undefined,
    },
    {
      label: 'Block Reward',
      value: formatWeiToEth(block?.transaction_fees || null),
    },
    {
      label: 'Total Difficulty',
      value: block?.total_difficulty || '-',
    },
    {
      label: 'Size',
      value: block?.size !== undefined ? `${ formatInteger(block.size) } bytes` : '-',
    },
  ];

  const gasRows: Array<StrictBlockGasRow> = [
    {
      label: 'Gas Used',
      value: block?.gas_used ? `${ formatInteger(block.gas_used) }` : '-',
      accent: block?.gas_used_percentage !== null && block?.gas_used_percentage !== undefined ? `${ block.gas_used_percentage.toFixed(2) }%` : undefined,
    },
    {
      label: 'Gas Limit',
      value: block?.gas_limit ? formatInteger(block.gas_limit) : '-',
    },
    {
      label: 'Base Fee Per Gas',
      value: block?.base_fee_per_gas ? `${ formatInteger(block.base_fee_per_gas) } wei` : '-',
    },
    {
      label: 'Burnt Fees',
      value: formatWeiToEth(block?.burnt_fees || null),
    },
  ];

  return {
    state: {
      mode: 'live',
      isLoading: blockQuery.isPlaceholderData,
      isError: blockQuery.isError,
      errorMessage: blockQuery.isError ? getErrorMessage(blockQuery.error) : undefined,
    },
    title: 'Block',
    blockHeight,
    minedBy: shortHash(block?.miner?.name || minedByHash),
    minedByHref: minedByHash ? route({ pathname: '/address/[hash]', query: { hash: minedByHash } }) : undefined,
    minedAgo,
    overviewRows,
    gasRows,
    refetch: blockQuery.refetch,
  };
}

