import React from 'react';

import { INTERNAL_TX } from 'stubs/internalTx';
import { generateListStub } from 'stubs/utils';
import useQueryWithPages from 'ui/shared/pagination/useQueryWithPages';

import type { BlockQuery } from './useBlockQuery';

interface Params {
  heightOrHash: string;
  blockQuery: BlockQuery;
  tab: string;
  poolIndex?: number | null;
}

export default function useBlockInternalTxsQuery({ heightOrHash, blockQuery, tab, poolIndex }: Params) {
  const queryParams = React.useMemo(() => {
    if (heightOrHash.startsWith('0x') || poolIndex == null) {
      return undefined;
    }
    return { pool_index: poolIndex };
  }, [ heightOrHash, poolIndex ]);

  const apiQuery = useQueryWithPages({
    resourceName: 'general:block_internal_txs',
    pathParams: { height_or_hash: heightOrHash },
    queryParams,
    options: {
      enabled: Boolean(tab === 'internal_txs' && !blockQuery.isPlaceholderData),
      placeholderData: generateListStub<'general:block_internal_txs'>(INTERNAL_TX, 10, { next_page_params: null }),
      refetchOnMount: false,
    },
  });

  return apiQuery;
}
