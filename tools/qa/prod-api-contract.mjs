import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
const liveHeadPath = process.env.PROD_LIVE_HEAD_PATH || '/api/v2/seth/live-head';
const fallbackHeadPath = process.env.PROD_FALLBACK_HEAD_PATH || '/api?module=block&action=eth_block_number';
const requireLiveHead = process.env.PROD_REQUIRE_LIVE_HEAD !== 'false';
const outputDir = path.resolve(process.cwd(), 'qa-artifacts', 'prod-checks');

function getType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

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

function validateField(errors, object, fieldName, expectedType, scope) {
  const value = object?.[fieldName];
  const actualType = getType(value);
  if (actualType !== expectedType) {
    errors.push(`${ scope }.${ fieldName } type mismatch, expected ${ expectedType }, got ${ actualType }`);
  }
}

function parseBlockNumber(result) {
  if (typeof result === 'number' && Number.isFinite(result)) {
    return result;
  }

  if (typeof result !== 'string' || !result.trim()) {
    return null;
  }

  const normalized = result.trim().toLowerCase();
  const parsed = normalized.startsWith('0x') ?
    Number.parseInt(normalized.slice(2), 16) :
    Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  endpoints: {},
  errors: [],
};

try {
  const [ stats, mainBlocks, blocks, transactions, fallbackHeadResult ] = await Promise.all([
    fetchJson('/api/v2/stats'),
    fetchJson('/api/v2/main-page/blocks'),
    fetchJson('/api/v2/blocks?type=block&items_count=2'),
    fetchJson('/api/v2/transactions?items_count=2'),
    fetchJson(fallbackHeadPath).catch((error) => ({ __error: error instanceof Error ? error.message : String(error) })),
  ]);
  let liveHead;
  try {
    liveHead = await fetchJson(liveHeadPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (requireLiveHead) {
      report.errors.push(message);
    }
    report.endpoints[liveHeadPath] = { error: message };
  }

  report.endpoints['/api/v2/stats'] = {
    total_blocks: stats?.total_blocks ?? null,
    total_transactions: stats?.total_transactions ?? null,
    seth_shards_count: Array.isArray(stats?.seth_shards) ? stats.seth_shards.length : null,
  };
  validateField(report.errors, stats, 'total_blocks', 'string', 'stats');
  validateField(report.errors, stats, 'total_transactions', 'string', 'stats');
  validateField(report.errors, stats, 'seth_shards', 'array', 'stats');

  const shards = Array.isArray(stats?.seth_shards) ? stats.seth_shards : [];
  const root = shards.find((item) => item?.name === 'root');
  const shard3 = shards.find((item) => item?.name === 'shard3');
  if (!root || !shard3) {
    report.errors.push('stats.seth_shards is missing root or shard3');
  }

  for (const shard of [ root, shard3 ]) {
    if (!shard) continue;
    const scope = `stats.seth_shards[${ shard.name }]`;
    validateField(report.errors, shard, 'name', 'string', scope);
    validateField(report.errors, shard, 'network', 'number', scope);
    validateField(report.errors, shard, 'pool_count', 'number', scope);
    validateField(report.errors, shard, 'pools', 'array', scope);

    const pools = Array.isArray(shard.pools) ? shard.pools : [];
    if (pools.length !== 32) {
      report.errors.push(`${ scope }.pools.length=${ pools.length }, expected 32`);
    }

    if (pools.length > 0) {
      const firstPool = pools[0];
      validateField(report.errors, firstPool, 'local_pool_index', 'number', `${ scope }.pools[0]`);
      validateField(report.errors, firstPool, 'global_pool_index', 'number', `${ scope }.pools[0]`);
      validateField(report.errors, firstPool, 'indexed', 'boolean', `${ scope }.pools[0]`);
    }
  }

  report.endpoints['/api/v2/main-page/blocks'] = {
    count: Array.isArray(mainBlocks) ? mainBlocks.length : null,
    top_height: Array.isArray(mainBlocks) && mainBlocks[0] ? mainBlocks[0].height : null,
  };
  if (!Array.isArray(mainBlocks) || mainBlocks.length === 0) {
    report.errors.push('main-page/blocks is empty or not an array');
  } else {
    validateField(report.errors, mainBlocks[0], 'height', 'number', 'main-page/blocks[0]');
    validateField(report.errors, mainBlocks[0], 'hash', 'string', 'main-page/blocks[0]');
    validateField(report.errors, mainBlocks[0], 'timestamp', 'string', 'main-page/blocks[0]');
    validateField(report.errors, mainBlocks[0], 'shard', 'string', 'main-page/blocks[0]');
    validateField(report.errors, mainBlocks[0], 'local_pool_index', 'number', 'main-page/blocks[0]');
  }

  report.endpoints['/api/v2/blocks'] = {
    count: Array.isArray(blocks?.items) ? blocks.items.length : null,
    top_height: Array.isArray(blocks?.items) && blocks.items[0] ? blocks.items[0].height : null,
  };
  if (!Array.isArray(blocks?.items) || blocks.items.length === 0) {
    report.errors.push('/api/v2/blocks.items is empty');
  } else {
    validateField(report.errors, blocks.items[0], 'height', 'number', 'blocks.items[0]');
    validateField(report.errors, blocks.items[0], 'hash', 'string', 'blocks.items[0]');
    validateField(report.errors, blocks.items[0], 'shard', 'string', 'blocks.items[0]');
    validateField(report.errors, blocks.items[0], 'pool_index', 'number', 'blocks.items[0]');
    validateField(report.errors, blocks.items[0], 'local_pool_index', 'number', 'blocks.items[0]');
  }

  report.endpoints['/api/v2/transactions'] = {
    count: Array.isArray(transactions?.items) ? transactions.items.length : null,
    first_hash: Array.isArray(transactions?.items) && transactions.items[0] ? transactions.items[0].hash : null,
  };
  if (!Array.isArray(transactions?.items) || transactions.items.length === 0) {
    report.errors.push('/api/v2/transactions.items is empty');
  } else {
    validateField(report.errors, transactions.items[0], 'hash', 'string', 'transactions.items[0]');
    validateField(report.errors, transactions.items[0], 'timestamp', 'string', 'transactions.items[0]');
    validateField(report.errors, transactions.items[0], 'result', 'string', 'transactions.items[0]');
  }

  if (fallbackHeadResult && !fallbackHeadResult.__error) {
    const fallbackHead = parseBlockNumber(fallbackHeadResult?.result);
    report.endpoints[fallbackHeadPath] = {
      height: fallbackHead,
    };

    if (fallbackHead === null) {
      report.errors.push(`${ fallbackHeadPath } result is invalid: ${ String(fallbackHeadResult?.result) }`);
    }
  } else {
    report.endpoints[fallbackHeadPath] = {
      error: fallbackHeadResult?.__error || 'unknown error',
    };
  }

  if (liveHead) {
    report.endpoints[liveHeadPath] = {
      source_state: liveHead?.source_state ?? null,
      global_height: liveHead?.global_head?.height ?? null,
      indexer_height: liveHead?.indexer_head?.height ?? null,
    };

    validateField(report.errors, liveHead, 'generated_at', 'string', 'live_head');
    validateField(report.errors, liveHead, 'source_state', 'string', 'live_head');
    validateField(report.errors, liveHead, 'global_head', 'object', 'live_head');
    validateField(report.errors, liveHead, 'indexer_head', 'object', 'live_head');
    validateField(report.errors, liveHead, 'lag', 'object', 'live_head');
    validateField(report.errors, liveHead, 'shards', 'array', 'live_head');

    if (getType(liveHead?.global_head) === 'object') {
      validateField(report.errors, liveHead.global_head, 'height', 'number', 'live_head.global_head');
      validateField(report.errors, liveHead.global_head, 'timestamp', 'string', 'live_head.global_head');
    }
    if (getType(liveHead?.indexer_head) === 'object') {
      const indexerHeightType = getType(liveHead.indexer_head.height);
      if (indexerHeightType !== 'number' && indexerHeightType !== 'null') {
        report.errors.push(`live_head.indexer_head.height type mismatch, expected number|null, got ${ indexerHeightType }`);
      }
    }
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `api-contract-${ timestamp }.json`);
await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

const status = report.errors.length > 0 ? 'FAIL' : 'PASS';
console.log(`[prod-api-contract] ${ status } -> ${ outputPath }`);

if (report.errors.length > 0) {
  console.error(`[prod-api-contract] errors=${ report.errors.length }`);
  for (const error of report.errors) {
    console.error(`- ${ error }`);
  }
  process.exitCode = 1;
}
