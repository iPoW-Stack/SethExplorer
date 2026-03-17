import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');

const METRICS_PATH = path.join(OUTPUT_DIR, 'runtime-vs-design-metrics.json');
const RUNTIME_META_PATH = path.join(OUTPUT_DIR, 'runtime-capture-meta.json');

const PAGES = [ 'home', 'blocks', 'txs', 'block', 'tx', 'address' ];

const GATE_MODE = (process.env.DESIGN_AUDIT_GATE || 'relaxed').toLowerCase();
const STRICT_DESKTOP_THRESHOLD = Number(process.env.DESIGN_STRICT_DESKTOP_THRESHOLD || 97);
const STRICT_MOBILE_THRESHOLD = Number(process.env.DESIGN_STRICT_MOBILE_THRESHOLD || 96);
const RELAXED_DESKTOP_AVG_THRESHOLD = Number(process.env.DESIGN_RELAXED_DESKTOP_AVG_THRESHOLD || 94.5);
const RELAXED_MOBILE_AVG_THRESHOLD = Number(process.env.DESIGN_RELAXED_MOBILE_AVG_THRESHOLD || 96);
const RELAXED_DESKTOP_MIN_THRESHOLD = Number(process.env.DESIGN_RELAXED_DESKTOP_MIN_THRESHOLD || 93.5);
const RELAXED_MOBILE_MIN_THRESHOLD = Number(process.env.DESIGN_RELAXED_MOBILE_MIN_THRESHOLD || 95);

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

  return desktopScore >= STRICT_DESKTOP_THRESHOLD && mobileScore >= STRICT_MOBILE_THRESHOLD && !loadingBlocked;
}

async function run() {
  const metrics = await readJsonSafe(METRICS_PATH, {});
  const runtimeMeta = await readJsonSafe(RUNTIME_META_PATH, {});
  const rows = PAGES.map((pageKey) => ({
    page: pageKey,
    desktop: metrics[pageKey]?.desktop?.similarity_score ?? 0,
    mobile: metrics[pageKey]?.mobile?.similarity_score ?? 0,
    loading_blocked_desktop: Boolean(runtimeMeta[pageKey]?.desktop?.loading_blocked),
    loading_blocked_mobile: Boolean(runtimeMeta[pageKey]?.mobile?.loading_blocked),
  }));

  if (GATE_MODE === 'strict') {
    const failures = [];
    let passCount = 0;

    for (const row of rows) {
      if (pagePass(metrics[row.page], runtimeMeta[row.page])) {
        passCount += 1;
        continue;
      }

      failures.push(row);
    }

    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`[audit:design:check] FAIL (${ GATE_MODE }) ${ passCount }/${ PAGES.length }`);
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
    console.log(`[audit:design:check] PASS (${ GATE_MODE }) ${ passCount }/${ PAGES.length }`);
    return;
  }

  const loadingBlockedPages = rows.filter((row) => row.loading_blocked_desktop || row.loading_blocked_mobile);
  const desktopScores = rows.map((row) => row.desktop);
  const mobileScores = rows.map((row) => row.mobile);
  const desktopAverage = desktopScores.reduce((sum, value) => sum + value, 0) / rows.length;
  const mobileAverage = mobileScores.reduce((sum, value) => sum + value, 0) / rows.length;
  const desktopMin = Math.min(...desktopScores);
  const mobileMin = Math.min(...mobileScores);

  const checks = [
    {
      ok: desktopAverage >= RELAXED_DESKTOP_AVG_THRESHOLD,
      message: `desktop avg ${ desktopAverage.toFixed(2) } < ${ RELAXED_DESKTOP_AVG_THRESHOLD }`,
    },
    {
      ok: mobileAverage >= RELAXED_MOBILE_AVG_THRESHOLD,
      message: `mobile avg ${ mobileAverage.toFixed(2) } < ${ RELAXED_MOBILE_AVG_THRESHOLD }`,
    },
    {
      ok: desktopMin >= RELAXED_DESKTOP_MIN_THRESHOLD,
      message: `desktop min ${ desktopMin.toFixed(2) } < ${ RELAXED_DESKTOP_MIN_THRESHOLD }`,
    },
    {
      ok: mobileMin >= RELAXED_MOBILE_MIN_THRESHOLD,
      message: `mobile min ${ mobileMin.toFixed(2) } < ${ RELAXED_MOBILE_MIN_THRESHOLD }`,
    },
    {
      ok: loadingBlockedPages.length === 0,
      message: `loading_blocked pages: ${ loadingBlockedPages.map((item) => item.page).join(', ') }`,
    },
  ];

  const failedChecks = checks.filter((item) => !item.ok);
  if (failedChecks.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[audit:design:check] FAIL (${ GATE_MODE })`);
    for (const failed of failedChecks) {
      // eslint-disable-next-line no-console
      console.error(`- ${ failed.message }`);
    }
    process.exitCode = 1;
    return;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[audit:design:check] PASS (${ GATE_MODE }) desktop(avg/min)=${ desktopAverage.toFixed(2) }/${ desktopMin.toFixed(2) } mobile(avg/min)=${ mobileAverage.toFixed(2) }/${ mobileMin.toFixed(2) }`,
  );
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[audit:design:check] failed:', error);
  process.exitCode = 1;
});
