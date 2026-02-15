import fs from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');
const FIXTURES_DIR = path.join(ROOT, 'tools', 'design-audit', 'fixtures');

const DESIGN_BASE_URL = process.env.DESIGN_BASE_URL || 'http://34.126.98.218:8082';
const VIEWPORTS = {
  desktop: { width: 1200, height: 750 },
  mobile: { width: 1170, height: 1992 },
};

async function ensureDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function normalizeUrl(base, targetPath) {
  if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
    return targetPath;
  }
  return new URL(targetPath, base).toString();
}

function fallbackCandidates(routePath) {
  if (routePath.endsWith('.html')) {
    return [ routePath, routePath.replace(/\.html$/, '') ];
  }
  return [ routePath, `${ routePath }.html` ];
}

async function gotoWithFallback(page, routePath) {
  const candidates = fallbackCandidates(routePath)
    .map(candidate => normalizeUrl(DESIGN_BASE_URL, candidate));

  for (const candidate of candidates) {
    try {
      const response = await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      const status = response?.status() ?? 0;
      if (status >= 200 && status < 400) {
        return { url: candidate, status };
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(`Unable to open design route "${ routePath }" from ${ DESIGN_BASE_URL }`);
}

async function waitForContentReady(page) {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => null);
  await page.waitForTimeout(1_500);
}

async function run() {
  await ensureDir();

  const routes = await readJson(path.join(FIXTURES_DIR, 'design-routes.json'));
  const browser = await chromium.launch({ headless: true });

  try {
    for (const [ viewportName, viewport ] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      for (const [ pageKey, routePath ] of Object.entries(routes)) {
        const { url, status } = await gotoWithFallback(page, routePath);
        await waitForContentReady(page);

        const outputPath = path.join(OUTPUT_DIR, `design-${ pageKey }-${ viewportName }.png`);
        await page.screenshot({ path: outputPath, fullPage: false });

        // eslint-disable-next-line no-console
        console.log(`[design][${ viewportName }] ${ pageKey} -> ${ status } ${ url }`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[capture-design] failed:', error);
  process.exitCode = 1;
});
