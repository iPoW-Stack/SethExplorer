/* eslint-disable no-restricted-properties */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

import { chromium } from 'playwright';

import { ensureRuntimeServer } from '../shared/ensure-runtime-server.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');
const FIXTURES_DIR = path.join(ROOT, 'tools', 'design-audit', 'fixtures');

const requestedRuntimeBaseUrl = process.env.RUNTIME_BASE_URL || 'http://localhost:8080';
let runtimeBaseUrl = requestedRuntimeBaseUrl;
const RUNTIME_ROUTES_PATH = path.join(OUTPUT_DIR, 'runtime-routes.json');
const RUNTIME_META_PATH = path.join(OUTPUT_DIR, 'runtime-capture-meta.json');
const GOTO_TIMEOUT_MS = Number(process.env.AUDIT_GOTO_TIMEOUT_MS || 45_000);
const SCREENSHOT_TIMEOUT_MS = Number(process.env.AUDIT_SCREENSHOT_TIMEOUT_MS || 30_000);
const GOTO_RETRIES = Number(process.env.AUDIT_GOTO_RETRIES || 2);
const STABLE_DIFF_THRESHOLD = Number(process.env.AUDIT_STABLE_DIFF_THRESHOLD || 0.003);
const STABLE_TIMEOUT_MS = Number(process.env.AUDIT_STABLE_TIMEOUT_MS || 12_000);
const STABLE_MIN_INTERVAL_MS = Number(process.env.AUDIT_STABLE_MIN_INTERVAL_MS || 500);

const VIEWPORTS = {
  desktop: { width: 1200, height: 750 },
  mobile: { width: 1170, height: 1992 },
};

const DETAIL_PAGE_KEYS = new Set([ 'block', 'tx', 'address' ]);
const DETAIL_FALLBACK_PATHS = {
  block: '/block/18249102',
  tx: '/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
  address: '/address/0x1234567890abcdef1234567890abcdef12345678',
};

const SKELETON_SELECTORS = [
  '.chakra-skeleton',
  '[data-scope="skeleton"]',
  '[data-loading="true"]',
  '[aria-busy="true"] .chakra-skeleton',
];

const CRITICAL_TEXT_PATTERNS = {
  home: /SETH|Latest|Dashboard/i,
  blocks: /Blocks/i,
  txs: /Transactions/i,
  block: /Block/i,
  tx: /Transaction/i,
  address: /Address/i,
};

async function ensureDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function readJsonSafe(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function tryParseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAbsoluteUrl(value) {
  return value.startsWith('http://') || value.startsWith('https://');
}

function normalizeUrl(base, targetPathOrUrl) {
  if (isAbsoluteUrl(targetPathOrUrl)) {
    return targetPathOrUrl;
  }
  return new URL(targetPathOrUrl, base).toString();
}

function sanitizeRoutes(defaultRoutes, existingRoutes) {
  const baseOrigin = tryParseUrl(runtimeBaseUrl)?.origin;
  const sanitized = {};

  for (const [ pageKey, defaultRoute ] of Object.entries(defaultRoutes || {})) {
    const route = existingRoutes?.[pageKey];

    if (!route) {
      sanitized[pageKey] = defaultRoute;
      continue;
    }

    // Never persist the known unstable block countdown route as runtime baseline.
    if (pageKey === 'block' && /\/block\/countdown\//.test(route)) {
      sanitized[pageKey] = defaultRoute;
      continue;
    }

    if (!isAbsoluteUrl(route)) {
      sanitized[pageKey] = route;
      continue;
    }

    const parsed = tryParseUrl(route);
    if (parsed?.origin === baseOrigin) {
      sanitized[pageKey] = route;
      continue;
    }

    sanitized[pageKey] = defaultRoute;
  }

  return sanitized;
}

async function gotoUrl(page, url) {
  let lastError;

  for (let attempt = 1; attempt <= GOTO_RETRIES; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS });
      const status = response?.status() ?? 0;
      const contentType = response?.headers()?.['content-type'] ?? '';
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => null);
      return { status, contentType };
    } catch (error) {
      lastError = error;
      if (attempt < GOTO_RETRIES) {
        await page.waitForTimeout(1_200);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function resolveFallbackRoute(page, pageKey) {
  const directPath = DETAIL_FALLBACK_PATHS[pageKey];
  if (directPath) {
    return normalizeUrl(runtimeBaseUrl, directPath);
  }

  return null;
}

async function isLoadingBlocked(page) {
  const loadingTextVisible = await page.getByText(/Loading data, please wait/i).first().isVisible().catch(() => false);
  const runtimeErrorVisible = await page.getByText(/Runtime capture blocked/i).first().isVisible().catch(() => false);
  return loadingTextVisible || runtimeErrorVisible;
}

async function waitForContentReady(page) {
  await page.waitForTimeout(2_000);

  // Best-effort waiting for skeleton to settle.
  const deadline = Date.now() + 16_000;
  while (Date.now() < deadline) {
    const blocked = await isLoadingBlocked(page);
    if (!blocked) {
      break;
    }
    await page.waitForTimeout(600);
  }
}

async function hasCriticalContent(page, pageKey) {
  const pattern = CRITICAL_TEXT_PATTERNS[pageKey];
  if (!pattern) {
    return true;
  }
  return page.getByText(pattern).first().isVisible().catch(() => false);
}

async function hasRuntimeErrorOverlay(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText || '';
    if (/Runtime Error/i.test(text) && /Resource load error/i.test(text)) {
      return true;
    }

    const nextErrorCard = document.querySelector('[data-nextjs-error], nextjs-portal');
    if (!nextErrorCard) {
      return false;
    }

    return /Runtime Error|Resource load error/i.test(text);
  }).catch(() => false);
}

async function countVisibleSkeleton(page) {
  return page.evaluate((selectors) => {
    let count = 0;
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        if (isVisible(node)) {
          count += 1;
        }
      }
    }

    return count;
  }, SKELETON_SELECTORS);
}

function diffRatioFromPngBuffers(firstBuffer, secondBuffer) {
  const first = PNG.sync.read(firstBuffer);
  const second = PNG.sync.read(secondBuffer);

  if (first.width !== second.width || first.height !== second.height) {
    return 1;
  }

  let changed = 0;
  const total = first.width * first.height;

  for (let i = 0; i < first.data.length; i += 4) {
    const dr = Math.abs(first.data[i] - second.data[i]);
    const dg = Math.abs(first.data[i + 1] - second.data[i + 1]);
    const db = Math.abs(first.data[i + 2] - second.data[i + 2]);
    const delta = (dr + dg + db) / 3;

    if (delta > 12) {
      changed += 1;
    }
  }

  return changed / total;
}

async function waitForStableViewport(page, pageKey) {
  const start = Date.now();

  let previousShot = await page.screenshot({ fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS });

  while (Date.now() - start < STABLE_TIMEOUT_MS) {
    const hasCritical = await hasCriticalContent(page, pageKey);
    const visibleSkeleton = await countVisibleSkeleton(page);

    await page.waitForTimeout(STABLE_MIN_INTERVAL_MS);

    const currentShot = await page.screenshot({ fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS });
    const diffRatio = diffRatioFromPngBuffers(previousShot, currentShot);

    if (hasCritical && visibleSkeleton === 0 && diffRatio <= STABLE_DIFF_THRESHOLD) {
      return;
    }

    previousShot = currentShot;
  }
}

function isNotFoundPage(status, pageUrl) {
  if (status === 404) {
    return true;
  }
  return /\/404(?:$|[/?#])/.test(pageUrl);
}

function isCountdownPage(pageKey, pageUrl) {
  if (pageKey !== 'block') {
    return false;
  }

  return /\/block\/countdown\//.test(pageUrl);
}

async function warmupRoutes(routes) {
  for (const routePathOrUrl of Object.values(routes)) {
    const url = normalizeUrl(runtimeBaseUrl, routePathOrUrl);
    try {
      await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(GOTO_TIMEOUT_MS) });
    } catch (error) {
      void error;
    }
  }
}

async function run() {
  await ensureDir();

  const defaultRoutes = await readJsonSafe(path.join(FIXTURES_DIR, 'runtime-routes.default.json'));
  const existingRoutes = await readJsonSafe(RUNTIME_ROUTES_PATH);
  const routes = sanitizeRoutes(defaultRoutes, existingRoutes);

  const runtimeCaptureMeta = {};
  const resolvedRoutes = {};

  const runtimeServer = await ensureRuntimeServer({
    baseUrl: runtimeBaseUrl,
    strictMode: true,
  });
  runtimeBaseUrl = runtimeServer.baseUrl;

  if (runtimeServer.started) {
    // eslint-disable-next-line no-console
    console.log(`[runtime] started local runtime server pid=${ runtimeServer.pid } base=${ runtimeBaseUrl }`);
  } else if (runtimeBaseUrl !== requestedRuntimeBaseUrl) {
    // eslint-disable-next-line no-console
    console.log(`[runtime] reusing existing runtime server at ${ runtimeBaseUrl }`);
  }

  await warmupRoutes(routes);

  try {
    const browser = await chromium.launch({ headless: true });

    try {
      for (const [ viewportName, viewport ] of Object.entries(VIEWPORTS)) {
        // eslint-disable-next-line no-console
        console.log(`[runtime] start viewport=${ viewportName }`);
        const context = await browser.newContext({ viewport });

        for (const [ pageKey, routePathOrUrl ] of Object.entries(routes)) {
          // eslint-disable-next-line no-console
          console.log(`[runtime] capture ${ viewportName }/${ pageKey }`);
          const page = await context.newPage();
          page.setDefaultNavigationTimeout(GOTO_TIMEOUT_MS);
          page.setDefaultTimeout(GOTO_TIMEOUT_MS);
          const initialUrl = normalizeUrl(runtimeBaseUrl, routePathOrUrl);
          let finalUrl = initialUrl;
          let finalStatus = 0;
          let finalContentType = '';
          let usedFallback = false;
          let loadingBlocked = true;
          let captureError;

          try {
            const firstVisit = await gotoUrl(page, initialUrl);
            finalStatus = firstVisit.status;
            finalContentType = firstVisit.contentType;
            finalUrl = page.url();
            let runtimeErrorVisible = await hasRuntimeErrorOverlay(page);

            if (
              DETAIL_PAGE_KEYS.has(pageKey) &&
              (isNotFoundPage(finalStatus, finalUrl) || isCountdownPage(pageKey, finalUrl) || runtimeErrorVisible)
            ) {
              const fallbackUrl = await resolveFallbackRoute(page, pageKey);
              if (fallbackUrl) {
                const fallbackVisit = await gotoUrl(page, fallbackUrl);
                finalStatus = fallbackVisit.status;
                finalContentType = fallbackVisit.contentType;
                finalUrl = page.url();
                usedFallback = true;
                runtimeErrorVisible = await hasRuntimeErrorOverlay(page);
              }
            }

            const looksLikeNonHtml = finalContentType.includes('application/json') || finalContentType.includes('text/plain');
            const hasHttpError = finalStatus >= 400;

            if (hasHttpError || looksLikeNonHtml || runtimeErrorVisible) {
              let reason = 'runtime error overlay detected';
              if (hasHttpError) {
                reason = `HTTP ${ finalStatus }`;
              } else if (looksLikeNonHtml) {
                reason = `unexpected content-type: ${ finalContentType || 'unknown' }`;
              }
              captureError = `Runtime route is not capturable (${ reason })`;
              loadingBlocked = true;
              await page.setContent(
                `<html><body style="background:#040608;color:#fff;font-family:Inter,sans-serif;padding:24px">
                  <h1>Runtime capture blocked</h1>
                  <p>${ captureError }</p>
                  <p>url: ${ finalUrl }</p>
                </body></html>`,
                { waitUntil: 'domcontentloaded', timeout: 5_000 },
              ).catch(() => null);
            } else {
              await waitForContentReady(page);
              loadingBlocked = await isLoadingBlocked(page);

              if (!loadingBlocked) {
                await waitForStableViewport(page, pageKey).catch(() => null);
              }
            }
          } catch (error) {
            captureError = error instanceof Error ? error.message : String(error);
            await page.setContent(
              `<html><body style="background:#040608;color:#fff;font-family:Inter,sans-serif;padding:24px">
                <h1>Runtime capture blocked</h1>
                <p>${ captureError }</p>
                <p>url: ${ initialUrl }</p>
              </body></html>`,
              { waitUntil: 'domcontentloaded', timeout: 5_000 },
            ).catch(() => null);
          }

          runtimeCaptureMeta[pageKey] = runtimeCaptureMeta[pageKey] || {};
          runtimeCaptureMeta[pageKey][viewportName] = {
            loading_blocked: loadingBlocked,
            used_fallback: usedFallback,
            final_url: finalUrl,
            final_status: finalStatus,
            final_content_type: finalContentType,
            ...(captureError ? { error: captureError } : {}),
          };

          resolvedRoutes[pageKey] = finalUrl;

          const outputPath = path.join(OUTPUT_DIR, `runtime-${ pageKey }-${ viewportName }.png`);
          try {
            await page.screenshot({ path: outputPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS });
          } catch (error) {
            captureError = captureError || (error instanceof Error ? error.message : String(error));
            await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: GOTO_TIMEOUT_MS }).catch(() => null);
            await page.screenshot({ path: outputPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS }).catch(() => null);
            runtimeCaptureMeta[pageKey][viewportName].error = captureError;
          }
          await page.close();

          // eslint-disable-next-line no-console
          console.log(
            `[runtime][${ viewportName }] ${ pageKey } -> ${ finalUrl } ` +
            `loading_blocked=${ loadingBlocked } fallback=${ usedFallback }` +
            `${ captureError ? ' error=true' : '' }`,
          );
        }

        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    await runtimeServer.stop();
  }

  await fs.writeFile(RUNTIME_ROUTES_PATH, `${ JSON.stringify(resolvedRoutes, null, 2) }\n`, 'utf8');
  await fs.writeFile(RUNTIME_META_PATH, `${ JSON.stringify(runtimeCaptureMeta, null, 2) }\n`, 'utf8');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[capture-runtime] failed:', error);
  process.exitCode = 1;
});
