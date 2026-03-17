import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_PORT = process.env.NEXT_PUBLIC_APP_PORT || '8080';

export const DEFAULT_WARMUP_ROUTES = [
  '/',
  '/blocks',
  '/txs',
  '/stats',
  '/api-docs',
  '/search-results?q=18249102',
  '/block/18249102',
  '/tx/0x8f5e5f9b8f2c7d2cf5f8610a6a2f2f7d6f4a0d9b5a7e3c2d1f0e9d8c7b6a5f4e',
  '/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
];

function formatMs(value) {
  return `${ Math.round(value) }ms`;
}

function extractScriptUrls({ html, baseUrl }) {
  const urls = new Set();
  const scriptPattern = /<script[^>]+src="([^"]+)"/g;
  let match = scriptPattern.exec(html);

  while (match) {
    const rawUrl = match[1];
    try {
      const url = new URL(rawUrl, baseUrl);
      const isNextAsset = url.pathname.startsWith('/_next/static/');
      if (isNextAsset) {
        urls.add(url.toString());
      }
    } catch {
      // Skip malformed script URLs and continue warmup.
    }

    match = scriptPattern.exec(html);
  }

  return [ ...urls ];
}

async function fetchWithPolling({ url, timeoutMs, pollIntervalMs = 1_000 }) {
  const startedAt = performance.now();
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  let lastStatus = null;
  let lastMessage = null;

  while (Date.now() < deadline) {
    attempts += 1;
    const timeLeftMs = Math.max(1_000, deadline - Date.now());
    const requestTimeoutMs = Math.min(20_000, timeLeftMs);

    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      lastStatus = response.status;

      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          attempts,
          elapsed: performance.now() - startedAt,
        };
      }
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    status: lastStatus ?? 'ERR',
    attempts,
    elapsed: performance.now() - startedAt,
    message: lastMessage || `Asset warmup timed out after ${ timeoutMs }ms`,
  };
}

async function warmRoute({ baseUrl, timeoutMs, route, warmedAssets }) {
  const url = `${ baseUrl }${ route }`;
  const startedAt = performance.now();
  const assetResults = [];
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  let lastMessage = null;

  while (Date.now() < deadline) {
    try {
      const timeLeftMs = Math.max(1_000, deadline - Date.now());
      const requestTimeoutMs = Math.min(20_000, timeLeftMs);
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(requestTimeoutMs),
      });

      lastStatus = response.status;
      if (!response.ok) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(1_000);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        // eslint-disable-next-line no-await-in-loop
        const html = await response.text();
        const assetUrls = extractScriptUrls({ html, baseUrl });

        for (const assetUrl of assetUrls) {
          if (warmedAssets.has(assetUrl)) {
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          const assetResult = await fetchWithPolling({ url: assetUrl, timeoutMs });
          assetResults.push({
            url: assetUrl,
            ...assetResult,
          });

          if (assetResult.ok) {
            warmedAssets.add(assetUrl);
          }
        }
      }

      const failedAssets = assetResults.filter((item) => !item.ok);
      return {
        route,
        status: response.status,
        elapsed: performance.now() - startedAt,
        ok: failedAssets.length === 0,
        assetsTotal: assetResults.length,
        assetsWarmed: assetResults.length - failedAssets.length,
        assetFailures: failedAssets,
        message: failedAssets.length > 0 ? `asset warmup failed (${ failedAssets.length })` : undefined,
      };
    } catch (error) {
      lastStatus = 'ERR';
      lastMessage = error instanceof Error ? error.message : String(error);
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1_000);
  }

  return {
    route,
    status: lastStatus ?? 'ERR',
    elapsed: performance.now() - startedAt,
    ok: false,
    assetsTotal: 0,
    assetsWarmed: 0,
    message: lastMessage || `Route warmup timed out after ${ timeoutMs }ms`,
  };
}

export async function warmupRuntimeRoutes({
  baseUrl,
  timeoutMs,
  routes = DEFAULT_WARMUP_ROUTES,
  logPrefix = '[warmup]',
} = {}) {
  const effectiveBaseUrl = baseUrl || process.env.RUNTIME_BASE_URL || process.env.E2E_BASE_URL || `http://localhost:${ DEFAULT_PORT }`;
  const effectiveTimeoutMs = Number(timeoutMs || process.env.WARMUP_TIMEOUT_MS || 180_000);

  const results = [];
  const warmedAssets = new Set();
  console.log(`${ logPrefix } base=${ effectiveBaseUrl } timeout=${ effectiveTimeoutMs }ms`);

  for (const route of routes) {
    // Sequential warmup is intentional to avoid flooding the runtime with
    // heavy first-compile requests.
    // eslint-disable-next-line no-await-in-loop
    const result = await warmRoute({
      baseUrl: effectiveBaseUrl,
      timeoutMs: effectiveTimeoutMs,
      route,
      warmedAssets,
    });
    results.push(result);
    const suffix = result.message ? ` ${ result.message }` : '';
    const assetSuffix = ` assets=${ result.assetsWarmed || 0 }/${ result.assetsTotal || 0 }`;
    console.log(`${ logPrefix } ${ result.status } ${ formatMs(result.elapsed) } ${ result.route }${ assetSuffix }${ suffix }`);
  }

  const failed = results.filter((item) => !item.ok);
  const totalMs = results.reduce((sum, item) => sum + item.elapsed, 0);
  if (failed.length > 0) {
    console.error(`${ logPrefix } completed with ${ failed.length } failed route(s)`);
  }
  console.log(`${ logPrefix } done (${ routes.length } routes, total ${ formatMs(totalMs) }, warmed assets ${ warmedAssets.size })`);

  return { results, failed, totalMs };
}

async function main() {
  const { failed } = await warmupRuntimeRoutes();
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  await main();
}
