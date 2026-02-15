import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import { ensureRuntimeServer } from '../shared/ensure-runtime-server.mjs';

const requestedRuntimeBaseUrl = process.env.RUNTIME_BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:8090';
let runtimeBaseUrl = requestedRuntimeBaseUrl;
const OUTPUT_DIR = path.resolve(process.cwd(), 'test-results', 'core-har');
const NAVIGATION_TIMEOUT = Number(process.env.CORE_HAR_TIMEOUT_MS || 60_000);
const NAVIGATION_RETRIES = Number(process.env.CORE_HAR_RETRIES || 1);
const HAR_CONTENT = process.env.CORE_HAR_CONTENT || 'omit';
const HAR_MODE = process.env.CORE_HAR_MODE || 'minimal';
const HARD_FAIL = process.env.CORE_HAR_HARD_FAIL === 'true';

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'blocks', path: '/blocks' },
  { name: 'txs', path: '/txs' },
  { name: 'block', path: '/block/18249102' },
  { name: 'tx', path: '/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6' },
  { name: 'address', path: '/address/0x1234567890abcdef1234567890abcdef12345678' },
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const harPath = path.join(OUTPUT_DIR, `core-${ timestamp }.har`);
const summaryPath = path.join(OUTPUT_DIR, `core-${ timestamp }.summary.json`);

const results = [];
let runtimeServer = null;
let startupError = null;

async function gotoWithRetry(page, url) {
  let lastError;

  for (let attempt = 0; attempt <= NAVIGATION_RETRIES; attempt += 1) {
    try {
      return await page.goto(url, {
        timeout: NAVIGATION_TIMEOUT,
        waitUntil: 'domcontentloaded',
      });
    } catch (error) {
      lastError = error;
      if (attempt < NAVIGATION_RETRIES) {
        await page.waitForTimeout(1_200);
      }
    }
  }

  throw lastError ?? new Error(`Failed to open ${ url }`);
}

try {
  runtimeServer = await ensureRuntimeServer({
    baseUrl: runtimeBaseUrl,
    strictMode: true,
    strictDataSource: process.env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE || 'live',
    fallbackPorts: [ 8080, 8095, 8096, 8097, 8098 ],
  });

  runtimeBaseUrl = runtimeServer.baseUrl;

  if (runtimeServer.started) {
    // eslint-disable-next-line no-console
    console.log(`[core-har] started local runtime server pid=${ runtimeServer.pid } base=${ runtimeBaseUrl }`);
  } else if (runtimeBaseUrl !== requestedRuntimeBaseUrl) {
    // eslint-disable-next-line no-console
    console.log(`[core-har] reusing existing runtime server at ${ runtimeBaseUrl }`);
  }
} catch (error) {
  startupError = error instanceof Error ? error.message : String(error);
}

try {
  await mkdir(OUTPUT_DIR, { recursive: true });

  if (startupError) {
    for (const route of ROUTES) {
      results.push({
        route: route.name,
        url: new URL(route.path, runtimeBaseUrl).toString(),
        finalUrl: 'about:blank',
        status: null,
        ok: false,
        error: `runtime startup failed: ${ startupError }`,
      });
    }
  } else {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      recordHar: {
        path: harPath,
        content: HAR_CONTENT,
        mode: HAR_MODE,
      },
    });
    const page = await context.newPage();

    try {
      for (const route of ROUTES) {
        const url = new URL(route.path, runtimeBaseUrl).toString();

        try {
          const response = await gotoWithRetry(page, url);
          await page.waitForTimeout(1200);

          results.push({
            route: route.name,
            url,
            finalUrl: page.url(),
            status: response?.status() ?? null,
            ok: Boolean(response?.ok()),
          });
        } catch (error) {
          results.push({
            route: route.name,
            url,
            finalUrl: page.url(),
            status: null,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }
} finally {
  await runtimeServer?.stop?.();
}

await writeFile(summaryPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseUrl: runtimeBaseUrl,
  startedLocalServer: Boolean(runtimeServer?.started),
  harPath,
  routes: results,
}, null, 2), 'utf8');

const failed = results.filter((item) => !item.ok);

if (failed.length) {
  console.error(`Core HAR capture finished with ${ failed.length } failed route(s).`);
  if (HARD_FAIL) {
    process.exitCode = 1;
  }
} else {
  console.log('Core HAR capture finished successfully.');
}
