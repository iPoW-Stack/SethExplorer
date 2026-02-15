import React from 'react';

import type { AddressQuery } from 'ui/address/utils/useAddressQuery';
import useAddressTxsQuery from 'ui/address/useAddressTxsQuery';

import { route } from 'nextjs-routes';

import useApiQuery from 'lib/api/useApiQuery';
import { getSethStrictDataSource } from 'lib/settings/useSethStrict';

import { ADDRESS_TX_ROWS } from '../data';
import type { StrictAddressTxRow, StrictDataState, StrictPaginationData } from './types';
import { formatAge, formatUsd, formatWeiToEth, getErrorMessage, shortHash } from './utils';

interface Params {
  hash: string;
  addressQuery?: AddressQuery;
}

interface StrictAddressData {
  state: StrictDataState;
  titleHash: string;
  rawHash: string;
  balanceLabel: string;
  balanceUsdLabel: string;
  holdingsLabel: string;
  holdingsHintLabel: string;
  txRows: Array<StrictAddressTxRow>;
  pagination?: StrictPaginationData;
  refetch?: () => void;
}

export default function useStrictAddressData({ hash, addressQuery }: Params): StrictAddressData {
  const dataSource = getSethStrictDataSource();
  const isStub = dataSource === 'stub';

  const normalizedHash = hash.toLowerCase();

  const txsQuery = useAddressTxsQuery({
    addressHash: hash,
    enabled: !isStub && Boolean(hash),
  });

  const tabsCountersQuery = useApiQuery('general:address_tabs_counters', {
    pathParams: { hash },
    queryOptions: {
      enabled: !isStub && Boolean(hash),
    },
  });

  const tokensQuery = useApiQuery('general:address_tokens', {
    pathParams: { hash },
    queryParams: { type: 'ERC-20' },
    queryOptions: {
      enabled: !isStub && Boolean(hash),
    },
  });

  if (isStub) {
    return {
      state: {
        mode: 'stub',
        isLoading: false,
        isError: false,
      },
      titleHash: '0x1234...5678',
      rawHash: '0x1234567890abcdef1234567890abcdef12345678',
      balanceLabel: '1,240.5926 ETH',
      balanceUsdLabel: '$2,284,859.32 (+2.4%)',
      holdingsLabel: '$45,291.00',
      holdingsHintLabel: '12,500 USDC',
      txRows: ADDRESS_TX_ROWS.map((item, index) => {
        const txHash = index === 0 ?
          '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6' :
          '0x8b2ca91dd8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a612';

        return {
          id: txHash,
          hash: item.hash,
          txHref: route({ pathname: '/tx/[hash]', query: { hash: txHash } }),
          method: item.method,
          block: item.block,
          blockHref: route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: item.block } }),
          age: item.age,
          from: item.from,
          to: item.to,
          value: item.value,
          fee: item.fee,
          fromYou: item.fromYou,
          toYou: item.toYou,
        };
      }),
    };
  }

  const address = addressQuery?.data;
  const txRows = (txsQuery.query.data?.items || []).slice(0, 10).map((item) => {
    const fromHash = item.from?.hash;
    const toHash = item.to?.hash || item.created_contract?.hash;
    const block = item.block_number ? String(item.block_number) : '-';

    return {
      id: item.hash,
      hash: shortHash(item.hash),
      txHref: route({ pathname: '/tx/[hash]', query: { hash: item.hash } }),
      method: item.method || item.transaction_types[0] || '-',
      block,
      blockHref: item.block_number ? route({ pathname: '/block/[height_or_hash]', query: { height_or_hash: String(item.block_number) } }) : undefined,
      age: formatAge(item.timestamp),
      from: shortHash(item.from?.name || fromHash),
      fromHref: fromHash ? route({ pathname: '/address/[hash]', query: { hash: fromHash } }) : undefined,
      to: shortHash(item.to?.name || toHash),
      toHref: toHash ? route({ pathname: '/address/[hash]', query: { hash: toHash } }) : undefined,
      value: formatWeiToEth(item.value),
      fee: formatWeiToEth(item.fee?.value || null),
      fromYou: fromHash?.toLowerCase() === normalizedHash,
      toYou: toHash?.toLowerCase() === normalizedHash,
    };
  });

  const firstToken = tokensQuery.data?.items?.[0];
  const tokenValue = firstToken?.value ? `${ firstToken.value } ${ firstToken.token.symbol || '' }`.trim() : null;

  return {
    state: {
      mode: 'live',
      isLoading: Boolean(
        addressQuery?.isPlaceholderData ||
        txsQuery.query.isPlaceholderData ||
        tabsCountersQuery.isPlaceholderData ||
        tokensQuery.isPlaceholderData,
      ),
      isError: Boolean(
        addressQuery?.isError ||
        txsQuery.query.isError ||
        tabsCountersQuery.isError ||
        tokensQuery.isError,
      ),
      errorMessage: getErrorMessage(
        addressQuery?.error ||
        txsQuery.query.error ||
        tabsCountersQuery.error ||
        tokensQuery.error,
      ),
    },
    titleHash: shortHash(address?.name || address?.hash || hash),
    rawHash: address?.hash || hash,
    balanceLabel: formatWeiToEth(address?.coin_balance || null),
    balanceUsdLabel: address?.exchange_rate && address?.coin_balance ?
      formatUsd(Number(address.exchange_rate) * Number(address.coin_balance) / 1e18) :
      '-',
    holdingsLabel: tabsCountersQuery.data?.token_balances_count !== null && tabsCountersQuery.data?.token_balances_count !== undefined ?
      `${ tabsCountersQuery.data.token_balances_count } token balances` :
      '-',
    holdingsHintLabel: tokenValue || 'No token holdings',
    txRows,
    pagination: {
      pageLabel: `Page ${ txsQuery.query.pagination.page }`,
      pageSizeLabel: '25',
      canGoPrev: txsQuery.query.pagination.canGoBackwards && !txsQuery.query.pagination.isLoading,
      canGoNext: txsQuery.query.pagination.hasNextPage && !txsQuery.query.pagination.isLoading,
      onPrev: txsQuery.query.pagination.onPrevPageClick,
      onNext: txsQuery.query.pagination.onNextPageClick,
    },
    refetch: txsQuery.query.refetch,
  };
}

