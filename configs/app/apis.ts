import type { ApiName } from 'lib/api/types';

import { stripTrailingSlash } from 'toolkit/utils/url';

import { getEnvValue } from './utils';

export interface ApiPropsBase {
  endpoint: string;
  basePath?: string;
  socketEndpoint?: string;
}

export interface ApiPropsFull extends ApiPropsBase {
  host: string;
  protocol: string;
  port?: string;
  socketEndpoint: string;
}

const generalApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_API_HOST');
  if (!apiHost) {
    return;
  }

  // When unset, prefer https for non-local APIs to avoid ws->wss redirects and mixed-content issues.
  const apiProtocolEnv = getEnvValue('NEXT_PUBLIC_API_PROTOCOL');
  const appProtocolEnv = getEnvValue('NEXT_PUBLIC_APP_PROTOCOL');
  const isLocalApi = apiHost?.includes('localhost') || apiHost?.includes('127.0.0.1');
  const apiSchema = apiProtocolEnv || (isLocalApi ? appProtocolEnv : 'https') || 'https';
  const apiPort = getEnvValue('NEXT_PUBLIC_API_PORT');
  const apiEndpoint = [
    apiSchema || 'https',
    '://',
    apiHost,
    apiPort && ':' + apiPort,
  ].filter(Boolean).join('');

  // If API is served over HTTPS, raw WS usually redirects to WSS and triggers noisy socket errors.
  // Force secure socket protocol in that case to keep real-time banners stable across pages.
  const socketSchemaRaw = getEnvValue('NEXT_PUBLIC_API_WEBSOCKET_PROTOCOL');
  const socketSchema =
    apiSchema === 'https' ?
      'wss' :
      (socketSchemaRaw || 'wss');
  const socketEndpoint = [
    socketSchema,
    '://',
    apiHost,
    apiPort && ':' + apiPort,
  ].filter(Boolean).join('');

  return Object.freeze({
    endpoint: apiEndpoint,
    basePath: stripTrailingSlash(getEnvValue('NEXT_PUBLIC_API_BASE_PATH') || ''),
    socketEndpoint: socketEndpoint,
    host: apiHost ?? '',
    protocol: apiSchema ?? 'https',
    port: apiPort,
  });
})();

const adminApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_ADMIN_SERVICE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const bensApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_NAME_SERVICE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const contractInfoApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_CONTRACT_INFO_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const metadataApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_METADATA_SERVICE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const rewardsApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_REWARDS_SERVICE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const multichainAggregatorApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_MULTICHAIN_AGGREGATOR_API_HOST');
  const cluster = getEnvValue('NEXT_PUBLIC_MULTICHAIN_CLUSTER');
  if (!apiHost || !cluster) {
    return;
  }

  try {
    const url = new URL(apiHost);

    return Object.freeze({
      endpoint: apiHost,
      socketEndpoint: `wss://${ url.host }`,
      basePath: `/api/v1/clusters/${ cluster }`,
    });
  } catch (error) {
    return;
  }
})();

const multichainStatsApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_MULTICHAIN_STATS_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const statsApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_STATS_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
    basePath: stripTrailingSlash(getEnvValue('NEXT_PUBLIC_STATS_API_BASE_PATH') || ''),
  });
})();

const tacApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_TAC_OPERATION_LIFECYCLE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const userOpsApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_USER_OPS_INDEXER_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const visualizeApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_VISUALIZE_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
    basePath: stripTrailingSlash(getEnvValue('NEXT_PUBLIC_VISUALIZE_API_BASE_PATH') || ''),
  });
})();

const clustersApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_CLUSTERS_API_HOST');
  if (!apiHost) {
    return;
  }

  return Object.freeze({
    endpoint: apiHost,
  });
})();

const zetachainApi = (() => {
  const apiHost = getEnvValue('NEXT_PUBLIC_ZETACHAIN_SERVICE_API_HOST');
  if (!apiHost) {
    return;
  }

  try {
    const url = new URL(apiHost);

    return Object.freeze({
      endpoint: apiHost,
      socketEndpoint: `wss://${ url.host }/socket`,
    });
  } catch (error) {
    return;
  }
})();

export type Apis = {
  general: ApiPropsFull | undefined;
} & Partial<Record<Exclude<ApiName, 'general'>, ApiPropsBase>>;

const apis: Apis = Object.freeze({
  general: generalApi,
  admin: adminApi,
  bens: bensApi,
  clusters: clustersApi,
  contractInfo: contractInfoApi,
  metadata: metadataApi,
  multichainAggregator: multichainAggregatorApi,
  multichainStats: multichainStatsApi,
  rewards: rewardsApi,
  stats: statsApi,
  tac: tacApi,
  userOps: userOpsApi,
  visualize: visualizeApi,
  zetachain: zetachainApi,
});

export default apis;
