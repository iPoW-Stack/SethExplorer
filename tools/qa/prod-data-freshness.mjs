import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
const maxLagSeconds = Number(process.env.PROD_MAX_LAG_SECONDS || 300);
const maxHeadDiff = Number(process.env.PROD_MAX_HEAD_DIFF || 2);
const maxLiveHeadLagSeconds = Number(process.env.PROD_MAX_LIVE_HEAD_LAG_SECONDS || 120);
const requireRootIndexed = process.env.REQUIRE_ROOT_INDEXED === 'true';
const requireLiveHead = process.env.PROD_REQUIRE_LIVE_HEAD !== 'false';
const allowChainPause = process.env.PROD_ALLOW_CHAIN_PAUSE === 'true' || process.argv.includes('--allow-chain-pause');
const crossSourceRetries = Number(process.env.PROD_CROSS_SOURCE_RETRIES || 2);
const crossSourceRetryDelayMs = Number(process.env.PROD_CROSS_SOURCE_RETRY_DELAY_MS || 2_000);
const liveHeadPath = process.env.PROD_LIVE_HEAD_PATH || '/api/v2/seth/live-head';
const fallbackHeadPath = process.env.PROD_FALLBACK_HEAD_PATH || '/api?module=block&action=eth_block_number';
const outputDir = path.resolve(process.cwd(), 'qa-artifacts', 'prod-checks');

async function fetchJson(relativeUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${ baseUrl }${ relativeUrl }`;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`${ relativeUrl } -> HTTP ${ response.status }`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTime(value) {
  if (!value || typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

function parseBlockNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const parsed = normalized.startsWith('0x') ?
    Number.parseInt(normalized.slice(2), 16) :
    Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const report = {
  generatedAt: now.toISOString(),
  baseUrl,
  thresholds: {
    maxLagSeconds,
    maxHeadDiff,
    maxLiveHeadLagSeconds,
    requireRootIndexed,
    requireLiveHead,
    allowChainPause,
    crossSourceRetries,
    crossSourceRetryDelayMs,
    liveHeadPath,
    fallbackHeadPath,
  },
  checks: {},
  errors: [],
  warnings: [],
};

try {
  const [ stats, mainBlocks, blocksList, liveHeadResult, fallbackHeadResult ] = await Promise.all([
    fetchJson('/api/v2/stats'),
    fetchJson('/api/v2/main-page/blocks'),
    fetchJson('/api/v2/blocks?type=block&items_count=5'),
    fetchJson(liveHeadPath).catch((error) => ({ __error: error instanceof Error ? error.message : String(error) })),
    fetchJson(fallbackHeadPath).catch((error) => ({ __error: error instanceof Error ? error.message : String(error) })),
  ]);

  const sethShards = Array.isArray(stats?.seth_shards) ? stats.seth_shards : [];
  const root = sethShards.find((item) => item?.name === 'root');
  const shard3 = sethShards.find((item) => item?.name === 'shard3');

  const rootPoolsLength = Array.isArray(root?.pools) ? root.pools.length : 0;
  const shard3PoolsLength = Array.isArray(shard3?.pools) ? shard3.pools.length : 0;

  report.checks.shards = {
    names: sethShards.map((item) => item?.name),
    rootPoolCount: root?.pool_count ?? null,
    rootPoolsLength,
    shard3PoolCount: shard3?.pool_count ?? null,
    shard3PoolsLength,
    rootIndexedPools: root?.indexed_pools ?? null,
    shard3IndexedPools: shard3?.indexed_pools ?? null,
  };

  if (!root || !shard3) {
    report.errors.push('stats.seth_shards is missing root or shard3');
  }

  if ((root?.pool_count ?? 0) !== 32 || rootPoolsLength !== 32) {
    report.errors.push(`root pools invalid: pool_count=${ root?.pool_count ?? 'null' }, pools.length=${ rootPoolsLength }`);
  }

  if ((shard3?.pool_count ?? 0) !== 32 || shard3PoolsLength !== 32) {
    report.errors.push(`shard3 pools invalid: pool_count=${ shard3?.pool_count ?? 'null' }, pools.length=${ shard3PoolsLength }`);
  }

  if (requireRootIndexed && (root?.indexed_pools ?? 0) <= 0) {
    report.errors.push('root indexed_pools=0 while gate requires root to have indexed pools');
  } else if ((root?.indexed_pools ?? 0) <= 0) {
    report.warnings.push('root indexed_pools=0 (root shard currently has no indexed data)');
  }

  const mainTop = Array.isArray(mainBlocks) && mainBlocks.length > 0 ? mainBlocks[0] : null;
  const listTop = Array.isArray(blocksList?.items) && blocksList.items.length > 0 ? blocksList.items[0] : null;
  const shard3Height = typeof shard3?.latest_height === 'number' ? shard3.latest_height : null;

  const mainHeight = typeof mainTop?.height === 'number' ? mainTop.height : null;
  const listHeight = typeof listTop?.height === 'number' ? listTop.height : null;
  const mainTimestamp = parseTime(mainTop?.timestamp || shard3?.latest_block_timestamp);

  report.checks.heights = {
    mainTopHeight: mainHeight,
    listTopHeight: listHeight,
    shard3LatestHeight: shard3Height,
    totalBlocks: stats?.total_blocks ?? null,
    topTimestamp: mainTop?.timestamp || shard3?.latest_block_timestamp || null,
  };

  if (mainHeight === null) {
    report.errors.push('main-page/blocks top height is missing');
  }

  if (listHeight === null) {
    report.errors.push('blocks list top height is missing');
  }

  if (shard3Height === null) {
    report.errors.push('stats.shard3.latest_height is missing');
  }

  if (mainHeight !== null && listHeight !== null) {
    const diff = Math.abs(mainHeight - listHeight);
    report.checks.heights.mainVsListDiff = diff;
    if (diff > maxHeadDiff) {
      report.errors.push(`main-page/blocks and /blocks top height diff too large: ${ diff }`);
    }
  }

  if (mainHeight !== null && shard3Height !== null) {
    const diff = Math.abs(mainHeight - shard3Height);
    report.checks.heights.mainVsShard3Diff = diff;
    if (diff > maxHeadDiff) {
      report.errors.push(`main-page/blocks and stats.shard3.latest_height diff too large: ${ diff }`);
    }
  }

  const liveHead = liveHeadResult && !liveHeadResult.__error ? liveHeadResult : null;
  const fallbackHead = fallbackHeadResult && !fallbackHeadResult.__error ?
    parseBlockNumber(fallbackHeadResult?.result) :
    null;

  report.checks.fallbackHead = {
    height: fallbackHead,
    error: fallbackHeadResult?.__error || null,
  };

  let liveHeadFreshnessLagSeconds = null;
  let mainHeadFreshnessLagSeconds = null;
  let liveHeadHeight = null;
  let liveHeadLagBlocks = null;
  let liveHeadSourceState = null;
  let liveHeadTimestamp = null;

  if (!liveHead) {
    const errorMessage = liveHeadResult?.__error || `live head endpoint ${ liveHeadPath } is unavailable`;
    if (requireLiveHead) {
      report.errors.push(errorMessage);
    } else {
      report.warnings.push(errorMessage);
    }
  } else {
    liveHeadHeight = typeof liveHead?.global_head?.height === 'number' ? liveHead.global_head.height : null;
    liveHeadTimestamp = parseTime(liveHead?.global_head?.timestamp);
    const liveHeadLagSeconds = typeof liveHead?.lag?.seconds === 'number' ? liveHead.lag.seconds : null;
    liveHeadLagBlocks = typeof liveHead?.lag?.blocks === 'number' ? liveHead.lag.blocks : null;
    liveHeadSourceState = typeof liveHead?.source_state === 'string' ? liveHead.source_state : null;

    report.checks.liveHead = {
      sourceState: liveHeadSourceState,
      height: liveHeadHeight,
      lagBlocks: liveHeadLagBlocks,
      lagSeconds: liveHeadLagSeconds,
      timestamp: liveHead?.global_head?.timestamp ?? null,
    };

    if (liveHeadHeight === null) {
      report.errors.push('live_head.global_head.height is missing');
    }

    if (liveHeadLagSeconds !== null && liveHeadLagSeconds > maxLiveHeadLagSeconds) {
      report.errors.push(`live_head.lag.seconds too large: ${ liveHeadLagSeconds }s > ${ maxLiveHeadLagSeconds }s`);
    }

    const getCrossSourceDiff = (nextMainHeight, nextListHeight, nextShard3Height, nextLiveHeadHeight) => {
      const knownHeights = [ nextMainHeight, nextListHeight, nextShard3Height, nextLiveHeadHeight ].filter((value) => typeof value === 'number');
      if (knownHeights.length < 2) {
        return null;
      }

      const maxHeight = Math.max(...knownHeights);
      const minHeight = Math.min(...knownHeights);
      return maxHeight - minHeight;
    };

    const initialDiff = getCrossSourceDiff(mainHeight, listHeight, shard3Height, liveHeadHeight);
    if (initialDiff !== null) {
      report.checks.heights.maxCrossSourceDiff = initialDiff;
      if (initialDiff > maxHeadDiff) {
        const samples = [ initialDiff ];

        for (let attempt = 1; attempt <= crossSourceRetries; attempt += 1) {
          // eslint-disable-next-line no-await-in-loop
          await sleep(crossSourceRetryDelayMs);
          // eslint-disable-next-line no-await-in-loop
          const [ retryStats, retryMainBlocks, retryBlocksList, retryLiveHeadResult ] = await Promise.all([
            fetchJson('/api/v2/stats').catch(() => null),
            fetchJson('/api/v2/main-page/blocks').catch(() => null),
            fetchJson('/api/v2/blocks?type=block&items_count=5').catch(() => null),
            fetchJson(liveHeadPath).catch(() => null),
          ]);

          const retryShard3 = Array.isArray(retryStats?.seth_shards) ? retryStats.seth_shards.find((item) => item?.name === 'shard3') : null;
          const retryMainHeight = Array.isArray(retryMainBlocks) && retryMainBlocks.length > 0 ? retryMainBlocks[0]?.height : null;
          const retryListHeight = Array.isArray(retryBlocksList?.items) && retryBlocksList.items.length > 0 ? retryBlocksList.items[0]?.height : null;
          const retryShard3Height = typeof retryShard3?.latest_height === 'number' ? retryShard3.latest_height : null;
          const retryLiveHeadHeight = typeof retryLiveHeadResult?.global_head?.height === 'number' ? retryLiveHeadResult.global_head.height : null;
          const retryDiff = getCrossSourceDiff(retryMainHeight, retryListHeight, retryShard3Height, retryLiveHeadHeight);

          if (retryDiff !== null) {
            samples.push(retryDiff);
          }
        }

        report.checks.heights.maxCrossSourceDiffSamples = samples;

        const minSample = Math.min(...samples);
        if (minSample > maxHeadDiff) {
          report.errors.push(`main/list/stats/live head diff too large: ${ initialDiff }`);
        } else {
          report.warnings.push(`transient cross-source diff observed: samples=${ samples.join(',') }`);
        }
      }
    }

    if (liveHeadHeight !== null && mainHeight !== null && liveHeadHeight < mainHeight) {
      report.errors.push(`live head is behind indexer main head: live=${ liveHeadHeight }, main=${ mainHeight }`);
    }

    if (liveHeadTimestamp !== null) {
      liveHeadFreshnessLagSeconds = Math.floor((Date.now() - liveHeadTimestamp) / 1000);
      report.checks.liveHead.freshnessLagSeconds = liveHeadFreshnessLagSeconds;
      if (liveHeadFreshnessLagSeconds > maxLiveHeadLagSeconds) {
        report.errors.push(`live head timestamp lag too large: ${ liveHeadFreshnessLagSeconds }s > ${ maxLiveHeadLagSeconds }s`);
      }
    }
  }

  if (fallbackHead !== null && mainHeight !== null && fallbackHead < mainHeight) {
    report.errors.push(`fallback head is behind indexer main head: fallback=${ fallbackHead }, main=${ mainHeight }`);
  }

  if (fallbackHead !== null && liveHead && typeof liveHead?.global_head?.height === 'number') {
    const liveHeadHeight = liveHead.global_head.height;
    if (fallbackHead > liveHeadHeight + maxHeadDiff) {
      report.errors.push(`fallback head and live head diff too large: fallback=${ fallbackHead }, live=${ liveHeadHeight }`);
    }
  }

  if (mainTimestamp === null) {
    report.errors.push('top block timestamp is missing or invalid');
  } else {
    mainHeadFreshnessLagSeconds = Math.floor((Date.now() - mainTimestamp) / 1000);
    report.checks.freshness = { lagSeconds: mainHeadFreshnessLagSeconds };
    if (mainHeadFreshnessLagSeconds > maxLagSeconds) {
      report.errors.push(`head timestamp lag too large: ${ mainHeadFreshnessLagSeconds }s > ${ maxLagSeconds }s`);
    }
  }

  const maintenanceSuspected = Boolean(
    allowChainPause &&
    liveHead &&
    typeof mainHeight === 'number' &&
    typeof liveHeadHeight === 'number' &&
    mainHeight === liveHeadHeight &&
    (liveHeadLagBlocks === 0 || liveHeadLagBlocks === null) &&
    typeof mainHeadFreshnessLagSeconds === 'number' &&
    typeof liveHeadFreshnessLagSeconds === 'number' &&
    mainHeadFreshnessLagSeconds > maxLiveHeadLagSeconds &&
    liveHeadFreshnessLagSeconds > maxLiveHeadLagSeconds &&
    (liveHeadSourceState === 'ok' || liveHeadSourceState === 'degraded')
  );

  report.checks.maintenanceSuspected = maintenanceSuspected;

  if (maintenanceSuspected) {
    const retainedErrors = [];
    for (const errorMessage of report.errors) {
      if (
        errorMessage.startsWith('live head timestamp lag too large') ||
        errorMessage.startsWith('head timestamp lag too large')
      ) {
        report.warnings.push(`${ errorMessage } (downgraded: chain pause mode)`);
      } else {
        retainedErrors.push(errorMessage);
      }
    }
    report.errors = retainedErrors;
    report.warnings.push('chain pause mode enabled: timestamp freshness errors are downgraded while chain production is paused');
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `freshness-${ stamp }.json`);
await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

const status = report.errors.length > 0 ? 'FAIL' : 'PASS';
console.log(`[prod-data-freshness] ${ status } -> ${ outputPath }`);

if (report.warnings.length > 0) {
  console.log(`[prod-data-freshness] warnings=${ report.warnings.length }`);
  for (const warning of report.warnings) {
    console.log(`- ${ warning }`);
  }
}

if (report.errors.length > 0) {
  console.error(`[prod-data-freshness] errors=${ report.errors.length }`);
  for (const error of report.errors) {
    console.error(`- ${ error }`);
  }
  process.exitCode = 1;
}
