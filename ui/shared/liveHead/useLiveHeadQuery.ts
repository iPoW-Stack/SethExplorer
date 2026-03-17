import React from 'react';

import type {
  SethBlockNumberResponse,
  SethLiveHeadResponse,
  SethLiveHeadShard,
  SethLiveHeadSourceState,
} from 'types/api/liveHead';
import type { HomeStats } from 'types/api/stats';

import type { ResourceError } from 'lib/api/resources';
import useApiQuery from 'lib/api/useApiQuery';
import {
  getSethLiveHeadPollMs,
  isSethLiveHeadEnabled,
} from 'lib/settings/useSethStrict';

interface Params {
  enabled?: boolean;
  indexerHeight?: number | null;
  indexerTimestamp?: string | null;
}

interface Result {
  data?: SethLiveHeadResponse;
  isError: boolean;
  isPending: boolean;
  isPlaceholderData: boolean;
  error?: ResourceError | null;
  source: 'live-head' | 'stats-fallback' | 'block-number-fallback' | 'none';
  refetch: () => void;
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function pickSourceState(shards: Array<SethLiveHeadShard>): SethLiveHeadSourceState {
  const states = shards
    .map((shard) => shard.source_state)
    .filter((state): state is SethLiveHeadSourceState => Boolean(state));

  if (states.length === 0) {
    return 'down';
  }

  if (states.some((state) => state === 'ok')) {
    return states.some((state) => state !== 'ok') ? 'degraded' : 'ok';
  }

  if (states.some((state) => state === 'degraded' || state === 'timeout')) {
    return 'degraded';
  }

  return 'down';
}

function parseBlockNumber(data?: SethBlockNumberResponse): number | null {
  const raw = data?.result;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }

  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  const parsed = normalized.startsWith('0x') ?
    Number.parseInt(normalized.slice(2), 16) :
    Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function mapStatsToLiveHead(
  stats?: HomeStats,
  indexerHeightOverride?: number | null,
  indexerTimestampOverride?: string | null,
): SethLiveHeadResponse | undefined {
  const shardItems = Array.isArray(stats?.seth_shards) ? stats.seth_shards : [];
  if (shardItems.length === 0) {
    return;
  }

  const shards: Array<SethLiveHeadShard> = shardItems.map((item) => ({
    name: item.name,
    network: item.network,
    pool_count: item.pool_count,
    indexed_pools: item.indexed_pools,
    latest_height: item.latest_height ?? null,
    latest_block_timestamp: item.latest_block_timestamp ?? null,
    source_state: item.source_state,
    error_code: item.error_code ?? null,
  }));

  const globalHead = shards.reduce<{ height: number | null; timestamp: string | null }>((acc, shard) => {
    if (typeof shard.latest_height !== 'number') {
      return acc;
    }

    if (acc.height === null || shard.latest_height > acc.height) {
      return {
        height: shard.latest_height,
        timestamp: shard.latest_block_timestamp || null,
      };
    }

    return acc;
  }, { height: null, timestamp: null });

  const indexerHeight = indexerHeightOverride ?? toSafeNumber(stats?.total_blocks) ?? null;
  const indexerTimestamp = indexerTimestampOverride ?? null;

  const lagBlocks = (() => {
    const explicitLag = toSafeNumber(stats?.index_lag_blocks ?? null);
    if (explicitLag !== null) {
      return explicitLag;
    }

    if (globalHead.height === null || indexerHeight === null) {
      return null;
    }

    return Math.max(0, globalHead.height - indexerHeight);
  })();

  const lagSeconds = (() => {
    const explicitLag = toSafeNumber(stats?.index_lag_seconds ?? null);
    if (explicitLag !== null) {
      return explicitLag;
    }

    const globalTs = parseTimestamp(globalHead.timestamp);
    const indexerTs = parseTimestamp(indexerTimestamp);
    if (globalTs === null || indexerTs === null) {
      return null;
    }

    return Math.max(0, Math.floor((globalTs - indexerTs) / 1000));
  })();

  return {
    generated_at: new Date().toISOString(),
    source_state: pickSourceState(shards),
    global_head: {
      height: globalHead.height,
      timestamp: globalHead.timestamp,
      source: 'stats-fallback',
    },
    indexer_head: {
      height: indexerHeight,
      timestamp: indexerTimestamp,
      source: 'indexer',
    },
    lag: {
      blocks: lagBlocks,
      seconds: lagSeconds,
    },
    shards,
  };
}

function mapBlockNumberToLiveHead(
  data?: SethBlockNumberResponse,
  indexerHeight?: number | null,
  indexerTimestamp?: string | null,
): SethLiveHeadResponse | undefined {
  const headHeight = parseBlockNumber(data);
  if (headHeight === null) {
    return;
  }

  return {
    generated_at: new Date().toISOString(),
    source_state: 'ok',
    global_head: {
      height: headHeight,
      timestamp: null,
      source: 'rpc-block-number',
    },
    indexer_head: {
      height: indexerHeight ?? null,
      timestamp: indexerTimestamp ?? null,
      source: 'indexer',
    },
    lag: {
      blocks: typeof indexerHeight === 'number' ? Math.max(0, headHeight - indexerHeight) : null,
      seconds: null,
    },
    shards: [],
  };
}

function pickFallbackData(
  statsFallbackData: SethLiveHeadResponse | undefined,
  blockNumberFallbackData: SethLiveHeadResponse | undefined,
): { data?: SethLiveHeadResponse; source: Result['source'] } {
  const statsHeight = toSafeNumber(statsFallbackData?.global_head?.height);
  const blockHeight = toSafeNumber(blockNumberFallbackData?.global_head?.height);

  if (blockHeight !== null && (statsHeight === null || blockHeight > statsHeight)) {
    if (!statsFallbackData) {
      return { data: blockNumberFallbackData, source: 'block-number-fallback' };
    }

    return {
      source: 'block-number-fallback',
      data: {
        ...statsFallbackData,
        source_state: statsFallbackData.source_state === 'down' ? 'degraded' : statsFallbackData.source_state,
        global_head: {
          ...statsFallbackData.global_head,
          height: blockHeight,
          source: 'rpc-block-number',
        },
        lag: {
          blocks: blockNumberFallbackData?.lag?.blocks ?? statsFallbackData.lag.blocks ?? null,
          seconds: null,
        },
      },
    };
  }

  if (statsFallbackData) {
    return {
      data: statsFallbackData,
      source: 'stats-fallback',
    };
  }

  if (blockNumberFallbackData) {
    return {
      data: blockNumberFallbackData,
      source: 'block-number-fallback',
    };
  }

  return { data: undefined, source: 'none' };
}

export default function useLiveHeadQuery({
  enabled = true,
  indexerHeight,
  indexerTimestamp,
}: Params = {}): Result {
  const isEnabled = enabled && isSethLiveHeadEnabled();
  const pollMs = getSethLiveHeadPollMs();

  const liveHeadQuery = useApiQuery('general:seth_live_head', {
    queryOptions: {
      enabled: isEnabled,
      refetchInterval: isEnabled ? pollMs : false,
      refetchIntervalInBackground: true,
      retry: 1,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  });

  const statsFallbackQuery = useApiQuery('general:stats', {
    queryOptions: {
      enabled: isEnabled && liveHeadQuery.isError,
      refetchInterval: isEnabled ? pollMs : false,
      refetchIntervalInBackground: true,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: 1,
    },
  });

  const blockNumberFallbackQuery = useApiQuery('general:seth_block_number', {
    queryOptions: {
      enabled: isEnabled && liveHeadQuery.isError,
      refetchInterval: isEnabled ? pollMs : false,
      refetchIntervalInBackground: true,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: 1,
    },
  });

  const statsFallbackData = React.useMemo(() => {
    return mapStatsToLiveHead(statsFallbackQuery.data, indexerHeight, indexerTimestamp);
  }, [ indexerHeight, indexerTimestamp, statsFallbackQuery.data ]);

  const blockNumberFallbackData = React.useMemo(() => {
    return mapBlockNumberToLiveHead(blockNumberFallbackQuery.data, indexerHeight, indexerTimestamp);
  }, [ blockNumberFallbackQuery.data, indexerHeight, indexerTimestamp ]);

  const hasLiveHead = typeof liveHeadQuery.data?.global_head?.height === 'number';
  const fallbackSelection = pickFallbackData(statsFallbackData, blockNumberFallbackData);

  const data = hasLiveHead ? liveHeadQuery.data : fallbackSelection.data;
  const source: Result['source'] = hasLiveHead ? 'live-head' : fallbackSelection.source;

  const isPending = liveHeadQuery.isPending || (
    source === 'none' && (statsFallbackQuery.isPending || blockNumberFallbackQuery.isPending)
  );
  const isPlaceholderData = liveHeadQuery.isPlaceholderData || (
    source === 'none' && (statsFallbackQuery.isPlaceholderData || blockNumberFallbackQuery.isPlaceholderData)
  );
  const isError = isEnabled &&
    source === 'none' &&
    liveHeadQuery.isError &&
    statsFallbackQuery.isError &&
    blockNumberFallbackQuery.isError;

  const refetch = React.useCallback(() => {
    void liveHeadQuery.refetch();
    void statsFallbackQuery.refetch();
    void blockNumberFallbackQuery.refetch();
  }, [ blockNumberFallbackQuery, liveHeadQuery, statsFallbackQuery ]);

  return {
    data,
    source,
    isPending,
    isPlaceholderData,
    isError,
    error: (liveHeadQuery.error ||
      statsFallbackQuery.error ||
      blockNumberFallbackQuery.error) as ResourceError | null,
    refetch,
  };
}
