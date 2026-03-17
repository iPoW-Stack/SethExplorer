import type { SethLiveHeadResponse, SethLiveHeadSourceState } from 'types/api/liveHead';

export type LiveHeadStatus = 'live' | 'indexed' | 'lagging' | 'stalled';

export interface LiveHeadDecisionInput {
  liveHead: SethLiveHeadResponse | null | undefined;
  indexerHeight?: number | null;
  switchBlocks: number;
  switchSeconds: number;
}

export interface LiveHeadDecisionResult {
  status: LiveHeadStatus;
  shouldUseLiveHead: boolean;
  headHeight: number | null;
  lagBlocks: number | null;
  lagSeconds: number | null;
  sourceState: SethLiveHeadSourceState | null;
}

function normalizeLagBlocks(liveHeadHeight: number | null, indexerHeight: number | null, lagBlocks: number | null) {
  if (lagBlocks !== null && Number.isFinite(lagBlocks)) {
    return lagBlocks;
  }

  if (liveHeadHeight === null || indexerHeight === null) {
    return null;
  }

  return Math.max(0, liveHeadHeight - indexerHeight);
}

function normalizeLagSeconds(lagSeconds: number | null) {
  return lagSeconds !== null && Number.isFinite(lagSeconds) ? lagSeconds : null;
}

export function getLiveHeadDecision({ liveHead, indexerHeight, switchBlocks, switchSeconds }: LiveHeadDecisionInput): LiveHeadDecisionResult {
  const headHeight = typeof liveHead?.global_head?.height === 'number' ? liveHead.global_head.height : null;
  const sourceState = liveHead?.source_state ?? null;
  const lagBlocksFromApi = typeof liveHead?.lag?.blocks === 'number' ? liveHead.lag.blocks : null;
  const lagSecondsFromApi = typeof liveHead?.lag?.seconds === 'number' ? liveHead.lag.seconds : null;
  const safeIndexerHeight = typeof indexerHeight === 'number' ? indexerHeight : null;

  const lagBlocks = normalizeLagBlocks(headHeight, safeIndexerHeight, lagBlocksFromApi);
  const lagSeconds = normalizeLagSeconds(lagSecondsFromApi);
  const isAheadOfIndexer =
    headHeight !== null &&
    safeIndexerHeight !== null &&
    headHeight > safeIndexerHeight;

  if (!liveHead || sourceState === 'down' || headHeight === null) {
    return {
      status: 'stalled',
      shouldUseLiveHead: false,
      headHeight,
      lagBlocks,
      lagSeconds,
      sourceState,
    };
  }

  const exceedsThreshold =
    (lagBlocks !== null && lagBlocks > switchBlocks) ||
    (lagSeconds !== null && lagSeconds > switchSeconds);

  // For chain-head UX, prefer the RPC head as soon as it is ahead of the
  // indexed head instead of waiting for a wider lag threshold.
  if (isAheadOfIndexer || exceedsThreshold) {
    return {
      status: 'live',
      shouldUseLiveHead: true,
      headHeight,
      lagBlocks,
      lagSeconds,
      sourceState,
    };
  }

  if (sourceState === 'degraded' || sourceState === 'timeout' || sourceState === 'unavailable') {
    return {
      status: 'lagging',
      shouldUseLiveHead: false,
      headHeight,
      lagBlocks,
      lagSeconds,
      sourceState,
    };
  }

  return {
    status: 'indexed',
    shouldUseLiveHead: false,
    headHeight,
    lagBlocks,
    lagSeconds,
    sourceState,
  };
}
