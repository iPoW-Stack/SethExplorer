import React from 'react';

import config from 'configs/app';
import useFetch from 'lib/hooks/useFetch';

interface Params {
  path: string;
}

export default function useFetchParentChainApi() {
  const fetch = useFetch();
  const apiBaseUrl = config.apis.general?.endpoint || config.app.baseUrl;

  return React.useCallback(({ path }: Params) => {
    return fetch(`${ apiBaseUrl }/api/v2${ path }`);
  }, [ apiBaseUrl, fetch ]);
}
