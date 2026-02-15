import React from 'react';

import { TX } from 'stubs/tx';
import { generateListStub } from 'stubs/utils';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';

import type { BlockQuery } from './useBlockQuery';

interface Params {
  heightOrHash: string;
  blockQuery: BlockQuery;
  tab: string;
  poolIndex?: number | null;
}

export default function useBlockBlobTxsQuery({ heightOrHash, blockQuery, tab, poolIndex }: Params) {
  const queryParams = React.useMemo(() => {
    if (heightOrHash.startsWith('0x') || poolIndex == null) {
      return undefined;
    }
    return { pool_index: poolIndex };
  }, [ heightOrHash, poolIndex ]);

  const apiQuery = useQueryWithPages({
    resourceName: 'general:block_txs',
    pathParams: { height_or_hash: heightOrHash },
    queryParams,
    filters: { type: 'blob_transaction' },
    options: {
      enabled: Boolean(tab === 'blob_txs' && !blockQuery.isPlaceholderData && blockQuery.data?.blob_transaction_count),
      placeholderData: generateListStub<'general:block_txs'>(TX, 3, { next_page_params: null }),
      refetchOnMount: false,
    },
  });

  return apiQuery;
}
