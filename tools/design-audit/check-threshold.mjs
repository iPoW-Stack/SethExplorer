import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');

const METRICS_PATH = path.join(OUTPUT_DIR, 'runtime-vs-design-metrics.json');
const RUNTIME_META_PATH = path.join(OUTPUT_DIR, 'runtime-capture-meta.json');

const PAGES = [ 'home', 'blocks', 'txs', 'block', 'tx', 'address' ];

const DESKTOP_THRESHOLD = 97;
const MOBILE_THRESHOLD = 96;

async function readJsonSafe(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function pagePass(metricsForPage, metaForPage) {
  const desktopScore = metricsForPage?.desktop?.similarity_score ?? 0;
  const mobileScore = metricsForPage?.mobile?.similarity_score ?? 0;
  const loadingBlocked = Boolean(metaForPage?.desktop?.loading_blocked || metaForPage?.mobile?.loading_blocked);

  return desktopScore >= DESKTOP_THRESHOLD && mobileScore >= MOBILE_THRESHOLD && !loadingBlocked;
}

async function run() {
  const metrics = await readJsonSafe(METRICS_PATH, {});
  const runtimeMeta = await readJsonSafe(RUNTIME_META_PATH, {});

  const failures = [];
  let passCount = 0;

  for (const pageKey of PAGES) {
    if (pagePass(metrics[pageKey], runtimeMeta[pageKey])) {
      passCount += 1;
      continue;
    }

    failures.push({
      page: pageKey,
      desktop: metrics[pageKey]?.desktop?.similarity_score ?? null,
      mobile: metrics[pageKey]?.mobile?.similarity_score ?? null,
      loading_blocked_desktop: runtimeMeta[pageKey]?.desktop?.loading_blocked ?? null,
      loading_blocked_mobile: runtimeMeta[pageKey]?.mobile?.loading_blocked ?? null,
    });
  }

  if (failures.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[audit:design:check] FAIL ${ passCount }/${ PAGES.length }`);
    for (const failure of failures) {
      // eslint-disable-next-line no-console
      console.error(
        `- ${ failure.page }: desktop=${ failure.desktop } mobile=${ failure.mobile } loading_blocked(desktop/mobile)=${ failure.loading_blocked_desktop }/${ failure.loading_blocked_mobile }`,
      );
    }
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[audit:design:check] PASS ${ passCount }/${ PAGES.length }`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[audit:design:check] failed:', error);
  process.exitCode = 1;
});
