import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
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
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    });

    if (!response.ok) {
      throw new Error(`${ relativeUrl } -> HTTP ${ response.status }`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function toIso(value) {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    shards: 0,
    totalPools: 0,
    indexedPools: 0,
    verifiedBlockDetails: 0,
    sampledTxDetails: 0,
    sampledTxPoolsWithoutTxs: 0,
  },
  shards: [],
  warnings: [],
  errors: [],
};

try {
  const stats = await fetchJson('/api/v2/stats');
  const shards = Array.isArray(stats?.seth_shards) ? stats.seth_shards : [];
  report.summary.shards = shards.length;

  if (shards.length === 0) {
    report.errors.push('stats.seth_shards is empty');
  }

  const requiredShardNames = [ 'root', 'shard3' ];
  for (const requiredName of requiredShardNames) {
    if (!shards.find((item) => item?.name === requiredName)) {
      report.errors.push(`missing required shard: ${ requiredName }`);
    }
  }

  for (const shard of shards) {
    const scope = `stats.seth_shards[${ shard?.name ?? '?' }]`;
    if (getType(shard?.name) !== 'string') {
      report.errors.push(`${ scope }.name type mismatch`);
      continue;
    }

    const pools = Array.isArray(shard.pools) ? shard.pools : [];
    const poolCount = typeof shard.pool_count === 'number' ? shard.pool_count : null;
    if (poolCount === null) {
      report.errors.push(`${ scope }.pool_count is not number`);
    } else if (pools.length !== poolCount) {
      report.errors.push(`${ scope }.pools.length=${ pools.length}, expected ${ poolCount }`);
    }

    const shardReport = {
      name: shard.name,
      network: typeof shard.network === 'number' ? shard.network : null,
      sourceState: shard.source_state ?? null,
      indexedPools: typeof shard.indexed_pools === 'number' ? shard.indexed_pools : null,
      latestHeight: shard.latest_height ?? null,
      pools: [],
    };

    if (shardReport.indexedPools === 0) {
      report.warnings.push(`${ shard.name } indexed_pools=0`);
    }

    for (const pool of pools) {
      report.summary.totalPools += 1;
      const isIndexed = pool?.indexed === true;
      if (isIndexed) {
        report.summary.indexedPools += 1;
      }

      const poolRecord = {
        global_pool_index: typeof pool?.global_pool_index === 'number' ? pool.global_pool_index : null,
        local_pool_index: typeof pool?.local_pool_index === 'number' ? pool.local_pool_index : null,
        indexed: isIndexed,
        latest_height: typeof pool?.latest_height === 'number' ? pool.latest_height : null,
        verified_height: null,
        latest_block_timestamp: toIso(pool?.latest_block_timestamp),
        block_detail_status: null,
        txs_status: null,
        tx_detail_status: null,
        sample_tx_hash: null,
        error: null,
      };

      if (isIndexed && poolRecord.global_pool_index !== null && poolRecord.latest_height !== null) {
        try {
          let resolvedHeight = poolRecord.latest_height;
          let blockDetail;
          let lastError = null;

          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const blockPath = `/api/v2/blocks/${ resolvedHeight }?pool_index=${ poolRecord.global_pool_index }`;
              blockDetail = await fetchJson(blockPath);
              break;
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              lastError = new Error(message);

              if (attempt === 0 && message.includes('HTTP 404')) {
                const latestStats = await fetchJson('/api/v2/stats');
                const latestShards = Array.isArray(latestStats?.seth_shards) ? latestStats.seth_shards : [];
                const latestPool = latestShards
                  .flatMap((item) => Array.isArray(item?.pools) ? item.pools : [])
                  .find((item) => item?.global_pool_index === poolRecord.global_pool_index);
                const refreshedHeight = typeof latestPool?.latest_height === 'number' ? latestPool.latest_height : null;

                if (refreshedHeight !== null && refreshedHeight !== resolvedHeight) {
                  resolvedHeight = refreshedHeight;
                  continue;
                }
              }

              break;
            }
          }

          if (!blockDetail) {
            throw lastError ?? new Error('failed to fetch block detail');
          }

          poolRecord.verified_height = resolvedHeight;
          const returnedPoolIndex = typeof blockDetail?.pool_index === 'number' ? blockDetail.pool_index : null;
          const returnedHeight = typeof blockDetail?.height === 'number' ? blockDetail.height : null;
          poolRecord.block_detail_status = 200;

          if (returnedPoolIndex !== poolRecord.global_pool_index) {
            report.errors.push(`${ scope }.pool[${ poolRecord.global_pool_index }] block detail pool mismatch`);
          } else if (returnedHeight !== resolvedHeight) {
            report.errors.push(`${ scope }.pool[${ poolRecord.global_pool_index }] block detail height mismatch`);
          } else {
            report.summary.verifiedBlockDetails += 1;
          }

          const txsPath = `/api/v2/blocks/${ resolvedHeight }/transactions?pool_index=${ poolRecord.global_pool_index }&items_count=1`;
          const txs = await fetchJson(txsPath);
          poolRecord.txs_status = 200;

          const sampleTxHash = Array.isArray(txs?.items) && txs.items[0]?.hash ? txs.items[0].hash : null;
          poolRecord.sample_tx_hash = sampleTxHash;
          if (sampleTxHash) {
            await fetchJson(`/api/v2/transactions/${ sampleTxHash }`);
            poolRecord.tx_detail_status = 200;
            report.summary.sampledTxDetails += 1;
          } else {
            report.summary.sampledTxPoolsWithoutTxs += 1;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          poolRecord.error = message;
          report.errors.push(`${ scope }.pool[${ poolRecord.global_pool_index ?? '?' }] ${ message }`);
        }
      }

      shardReport.pools.push(poolRecord);
    }

    report.shards.push(shardReport);
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `pool-coverage-${ timestamp }.json`);
await writeFile(outputPath, `${ JSON.stringify(report, null, 2) }\n`, 'utf8');

const status = report.errors.length > 0 ? 'FAIL' : 'PASS';
console.log(`[prod-pool-coverage] ${ status } -> ${ outputPath }`);
console.log(`[prod-pool-coverage] shards=${ report.summary.shards } pools=${ report.summary.totalPools } indexed=${ report.summary.indexedPools } verified_blocks=${ report.summary.verifiedBlockDetails } sampled_txs=${ report.summary.sampledTxDetails }`);

if (report.warnings.length > 0) {
  console.warn(`[prod-pool-coverage] warnings=${ report.warnings.length }`);
  for (const warning of report.warnings) {
    console.warn(`- ${ warning }`);
  }
}

if (report.errors.length > 0) {
  console.error(`[prod-pool-coverage] errors=${ report.errors.length }`);
  for (const error of report.errors) {
    console.error(`- ${ error }`);
  }
  process.exitCode = 1;
}
