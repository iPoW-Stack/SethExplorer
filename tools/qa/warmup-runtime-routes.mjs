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

async function warmRoute({ baseUrl, timeoutMs, route }) {
  const url = `${ baseUrl }${ route }`;
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsed = performance.now() - startedAt;
    return {
      route,
      status: response.status,
      elapsed,
      ok: response.ok,
    };
  } catch (error) {
    const elapsed = performance.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    return {
      route,
      status: 'ERR',
      elapsed,
      ok: false,
      message,
    };
  }
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
  console.log(`${ logPrefix } base=${ effectiveBaseUrl } timeout=${ effectiveTimeoutMs }ms`);

  for (const route of routes) {
    // Sequential warmup is intentional to avoid flooding the runtime with
    // heavy first-compile requests.
    // eslint-disable-next-line no-await-in-loop
    const result = await warmRoute({ baseUrl: effectiveBaseUrl, timeoutMs: effectiveTimeoutMs, route });
    results.push(result);
    const suffix = result.message ? ` ${ result.message }` : '';
    console.log(`${ logPrefix } ${ result.status } ${ formatMs(result.elapsed) } ${ result.route }${ suffix }`);
  }

  const failed = results.filter((item) => !item.ok);
  const totalMs = results.reduce((sum, item) => sum + item.elapsed, 0);
  if (failed.length > 0) {
    console.error(`${ logPrefix } completed with ${ failed.length } failed route(s)`);
  }
  console.log(`${ logPrefix } done (${ routes.length } routes, total ${ formatMs(totalMs) })`);

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
import { pathToFileURL } from 'node:url';
