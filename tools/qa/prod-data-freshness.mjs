import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
const maxLagSeconds = Number(process.env.PROD_MAX_LAG_SECONDS || 300);
const maxHeadDiff = Number(process.env.PROD_MAX_HEAD_DIFF || 2);
const requireRootIndexed = process.env.REQUIRE_ROOT_INDEXED === 'true';
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

function parseTime(value) {
  if (!value || typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isNaN(milliseconds) ? null : milliseconds;
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const report = {
  generatedAt: now.toISOString(),
  baseUrl,
  thresholds: {
    maxLagSeconds,
    maxHeadDiff,
    requireRootIndexed,
  },
  checks: {},
  errors: [],
  warnings: [],
};

try {
  const [ stats, mainBlocks, blocksList ] = await Promise.all([
    fetchJson('/api/v2/stats'),
    fetchJson('/api/v2/main-page/blocks'),
    fetchJson('/api/v2/blocks?type=block&items_count=5'),
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

  if (mainTimestamp === null) {
    report.errors.push('top block timestamp is missing or invalid');
  } else {
    const lagSeconds = Math.floor((Date.now() - mainTimestamp) / 1000);
    report.checks.freshness = { lagSeconds };
    if (lagSeconds > maxLagSeconds) {
      report.errors.push(`head timestamp lag too large: ${ lagSeconds }s > ${ maxLagSeconds }s`);
    }
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
