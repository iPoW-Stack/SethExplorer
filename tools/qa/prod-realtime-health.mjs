import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
const sampleDurationSeconds = Number(process.env.PROD_REALTIME_WINDOW_SECONDS || 600);
const sampleIntervalSeconds = Number(process.env.PROD_REALTIME_INTERVAL_SECONDS || 30);
const minHeadAdvances = Number(process.env.PROD_REALTIME_MIN_ADVANCES || 5);
const liveHeadPath = process.env.PROD_LIVE_HEAD_PATH || '/api/v2/seth/live-head';
const fallbackHeadPath = process.env.PROD_FALLBACK_HEAD_PATH || '/api?module=block&action=eth_block_number';
const outputDir = path.resolve(process.cwd(), 'qa-artifacts', 'prod-checks');

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(relativeUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${ baseUrl }${ relativeUrl }`, {
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
  windowSeconds: sampleDurationSeconds,
  intervalSeconds: sampleIntervalSeconds,
  minHeadAdvances,
  liveHeadPath,
  fallbackHeadPath,
  samples: [],
  summary: {
    sampleCount: 0,
    liveHeadAdvances: 0,
    indexerAdvances: 0,
    liveHeadAvailable: false,
  },
  errors: [],
  warnings: [],
};

const rounds = Math.max(1, Math.floor(sampleDurationSeconds / sampleIntervalSeconds));

let previousLiveHead = null;
let previousIndexerHead = null;

for (let round = 0; round < rounds; round += 1) {
  const sampledAt = new Date().toISOString();

  try {
    const [ liveHeadResult, fallbackHeadResult, stats, mainBlocks ] = await Promise.all([
      fetchJson(liveHeadPath).catch((error) => ({ __error: error instanceof Error ? error.message : String(error) })),
      fetchJson(fallbackHeadPath).catch((error) => ({ __error: error instanceof Error ? error.message : String(error) })),
      fetchJson('/api/v2/stats'),
      fetchJson('/api/v2/main-page/blocks'),
    ]);

    const liveHead = liveHeadResult && !liveHeadResult.__error ? liveHeadResult : null;
    const fallbackHead = fallbackHeadResult && !fallbackHeadResult.__error ?
      parseBlockNumber(fallbackHeadResult?.result) :
      null;

    const liveHeightFromEndpoint = liveHead && typeof liveHead?.global_head?.height === 'number' ?
      liveHead.global_head.height :
      null;
    const liveHeight = liveHeightFromEndpoint ?? fallbackHead;
    const statsShard3 = Array.isArray(stats?.seth_shards) ? stats.seth_shards.find((item) => item?.name === 'shard3') : null;
    const indexerFromStats = typeof statsShard3?.latest_height === 'number' ? statsShard3.latest_height : null;
    const indexerFromMain = Array.isArray(mainBlocks) && typeof mainBlocks?.[0]?.height === 'number' ? mainBlocks[0].height : null;
    const indexerHeight = indexerFromMain ?? indexerFromStats;

    report.summary.liveHeadAvailable = report.summary.liveHeadAvailable || liveHeight !== null;

    if (previousLiveHead !== null && liveHeight !== null && liveHeight > previousLiveHead) {
      report.summary.liveHeadAdvances += 1;
    }

    if (previousIndexerHead !== null && indexerHeight !== null && indexerHeight > previousIndexerHead) {
      report.summary.indexerAdvances += 1;
    }

    if (liveHeight !== null) {
      previousLiveHead = liveHeight;
    }

    if (indexerHeight !== null) {
      previousIndexerHead = indexerHeight;
    }

    report.samples.push({
      sampledAt,
      liveHeadHeight: liveHeight,
      liveHeadState: liveHead?.source_state ?? null,
      liveHeadSource: liveHeightFromEndpoint !== null ? 'live-head' : (fallbackHead !== null ? 'fallback-head' : null),
      indexerHeight,
      indexerFromMain,
      indexerFromStats,
      lagBlocks: liveHeight !== null && indexerHeight !== null ? Math.max(0, liveHeight - indexerHeight) : null,
      lagSeconds: liveHead?.lag?.seconds ?? null,
      liveHeadError: liveHeadResult?.__error || null,
      fallbackHeadError: fallbackHeadResult?.__error || null,
    });
  } catch (error) {
    report.samples.push({
      sampledAt,
      error: error instanceof Error ? error.message : String(error),
    });
    report.warnings.push(`sample ${ round + 1 } failed`);
  }

  if (round < rounds - 1) {
    await sleep(sampleIntervalSeconds * 1000);
  }
}

report.summary.sampleCount = report.samples.length;

if (!report.summary.liveHeadAvailable) {
  report.errors.push('live head is unavailable for all samples');
}

if (report.summary.liveHeadAdvances < minHeadAdvances) {
  report.errors.push(`live head advances ${ report.summary.liveHeadAdvances } < ${ minHeadAdvances } within ${ sampleDurationSeconds }s`);
}

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `realtime-health-${ stamp }.json`);
await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

const status = report.errors.length > 0 ? 'FAIL' : 'PASS';
console.log(`[prod-realtime-health] ${ status } -> ${ outputPath }`);

if (report.warnings.length > 0) {
  console.log(`[prod-realtime-health] warnings=${ report.warnings.length }`);
  for (const warning of report.warnings) {
    console.log(`- ${ warning }`);
  }
}

if (report.errors.length > 0) {
  console.error(`[prod-realtime-health] errors=${ report.errors.length }`);
  for (const error of report.errors) {
    console.error(`- ${ error }`);
  }
  process.exitCode = 1;
}
