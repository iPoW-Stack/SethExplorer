import React from 'react';

import { route } from 'nextjs-routes';

import { getSethStrictDataSource } from 'lib/settings/useSethStrict';
import type { TxQuery } from 'ui/tx/useTxQuery';

import { TX_OVERVIEW_ROWS } from '../data';
import type { StrictDataState, StrictTxOverviewRow } from './types';
import { formatAge, formatDateTime, formatWeiToEth, getErrorMessage, shortHash } from './utils';

interface Params {
  txQuery?: TxQuery;
  hash?: string;
}

interface StrictTransactionDetailData {
  state: StrictDataState;
  title: string;
  overviewRows: Array<StrictTxOverviewRow>;
  refetch?: () => void;
}

export default function useStrictTransactionDetailData({ txQuery, hash }: Params): StrictTransactionDetailData {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  if (isStub) {
    return {
      state: {
        mode: 'stub',
        isLoading: false,
        isError: false,
      },
      title: 'Transaction Details',
      overviewRows: TX_OVERVIEW_ROWS,
    };
  }

  if (!txQuery) {
    return {
      state: {
        mode: 'live',
        isLoading: false,
        isError: true,
        errorMessage: 'Missing transaction query for strict live mode',
      },
      title: 'Transaction Details',
      overviewRows: [],
    };
  }

  const tx = txQuery.data;
  const txHash = tx?.hash || hash || '-';
  const timestampDetail = tx?.timestamp ? formatDateTime(tx.timestamp) : '-';
  const timestampDisplay = tx?.timestamp ? `${ formatAge(tx.timestamp) } (${ timestampDetail })` : '-';

  const blockNumber = tx?.block_number !== null && tx?.block_number !== undefined ? String(tx.block_number) : '-';
  const blockHref = tx?.block_number !== null && tx?.block_number !== undefined ?
    route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: String(tx.block_number) } }) :
    undefined;

  const fromHash = tx?.from?.hash;
  const toHash = tx?.to?.hash || tx?.created_contract?.hash;
  const confirmations = tx?.confirmations ?? 0;

  const overviewRows: Array<StrictTxOverviewRow> = [
    {
      label: 'Transaction Hash',
      value: txHash,
      copyValue: txHash !== '-' ? txHash : undefined,
    },
    {
      label: 'Status',
      value: tx?.status === 'ok' ? 'Success' : (tx?.status === 'error' ? 'Failed' : 'Pending'),
      isStatus: true,
    },
    {
      label: 'Block',
      value: blockNumber,
      href: blockHref,
      suffix: `${ confirmations } confirmations`,
    },
    {
      label: 'Timestamp',
      value: timestampDisplay,
    },
    {
      label: 'From',
      value: shortHash(tx?.from?.name || fromHash),
      href: fromHash ? route({ pathname: '/address/[hash]', query: { hash: fromHash } }) : undefined,
      copyValue: fromHash || undefined,
    },
    {
      label: 'To',
      value: shortHash(tx?.to?.name || toHash),
      href: toHash ? route({ pathname: '/address/[hash]', query: { hash: toHash } }) : undefined,
      copyValue: toHash || undefined,
    },
    {
      label: 'Value',
      value: formatWeiToEth(tx?.value || null),
      isChip: true,
    },
    {
      label: 'Transaction Fee',
      value: formatWeiToEth(tx?.fee?.value || null),
    },
  ];

  return {
    state: {
      mode: 'live',
      isLoading: txQuery.isPlaceholderData,
      isError: txQuery.isError,
      errorMessage: txQuery.isError ? getErrorMessage(txQuery.error) : undefined,
    },
    title: 'Transaction Details',
    overviewRows,
    refetch: txQuery.refetch,
  };
}

