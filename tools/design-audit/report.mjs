import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'design-audit');
const DOC_PATH = path.join(ROOT, 'docs', 'ui-audit-seth-strict.md');
const DESIGN_BASE_URL = process.env.DESIGN_BASE_URL || 'http://34.126.98.218:8082/';
const RUNTIME_BASE_URL = process.env.RUNTIME_BASE_URL || `http://localhost:${ process.env.NEXT_PUBLIC_APP_PORT || '8080' }`;

const METRICS_PATH = path.join(OUTPUT_DIR, 'runtime-vs-design-metrics.json');
const RUNTIME_ROUTES_PATH = path.join(OUTPUT_DIR, 'runtime-routes.json');
const RUNTIME_META_PATH = path.join(OUTPUT_DIR, 'runtime-capture-meta.json');

const PAGES = [ 'home', 'blocks', 'txs', 'block', 'tx', 'address' ];
const PAGE_TITLE_MAP = {
  home: 'Home `/`',
  blocks: 'Blocks `/blocks`',
  txs: 'Transactions `/txs`',
  block: 'Block `/block/[id]`',
  tx: 'Tx `/tx/[hash]`',
  address: 'Address `/address/[hash]`',
};

const DESKTOP_THRESHOLD = 97;
const MOBILE_THRESHOLD = 96;

function formatNum(value, digits = 2) {
  return Number(value).toFixed(digits);
}

async function readJsonSafe(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

function evaluatePage(pageMetrics, pageMeta) {
  const desktopScore = pageMetrics?.desktop?.similarity_score ?? 0;
  const mobileScore = pageMetrics?.mobile?.similarity_score ?? 0;

  const desktopChangedRatio = pageMetrics?.desktop?.changed_ratio ?? 1;
  const mobileChangedRatio = pageMetrics?.mobile?.changed_ratio ?? 1;

  const desktopLoadingBlocked = Boolean(pageMeta?.desktop?.loading_blocked);
  const mobileLoadingBlocked = Boolean(pageMeta?.mobile?.loading_blocked);

  const desktopPass = desktopScore >= DESKTOP_THRESHOLD;
  const mobilePass = mobileScore >= MOBILE_THRESHOLD;
  const loadingPass = !desktopLoadingBlocked && !mobileLoadingBlocked;

  return {
    desktopScore,
    mobileScore,
    desktopChangedRatio,
    mobileChangedRatio,
    desktopLoadingBlocked,
    mobileLoadingBlocked,
    desktopPass,
    mobilePass,
    loadingPass,
    passed: desktopPass && mobilePass && loadingPass,
  };
}

function inferRuntimeBase(runtimeRoutes) {
  const firstRouteUrl = Object.values(runtimeRoutes)
    .find((value) => typeof value === 'string' && /^https?:\/\//.test(value));

  if (!firstRouteUrl) {
    return RUNTIME_BASE_URL;
  }

  try {
    return new URL(firstRouteUrl).origin;
  } catch {
    return RUNTIME_BASE_URL;
  }
}

async function run() {
  const metrics = await readJsonSafe(METRICS_PATH, {});
  const runtimeRoutes = await readJsonSafe(RUNTIME_ROUTES_PATH, {});
  const runtimeMeta = await readJsonSafe(RUNTIME_META_PATH, {});
  const inferredRuntimeBase = inferRuntimeBase(runtimeRoutes);

  const generatedAt = new Date().toISOString();

  let passCount = 0;
  const matrixRows = [];
  const metricRows = [];
  const p0 = [];
  const p1 = [];
  const p2 = [];

  for (const pageKey of PAGES) {
    const pageTitle = PAGE_TITLE_MAP[pageKey];
    const result = evaluatePage(metrics[pageKey], runtimeMeta[pageKey]);

    if (result.passed) {
      passCount += 1;
    }

    if (!result.loadingPass) {
      p0.push(
        `- ${ pageTitle }: loading_blocked desktop=${ result.desktopLoadingBlocked }, mobile=${ result.mobileLoadingBlocked }`,
      );
    }

    if (!result.desktopPass || !result.mobilePass) {
      p0.push(`- ${ pageTitle }: score below threshold (desktop=${ result.desktopScore }, mobile=${ result.mobileScore })`);
    }

    if (result.mobileChangedRatio > 0.14) {
      p1.push(`- ${ pageTitle }: high mobile changed_ratio (${ formatNum(result.mobileChangedRatio * 100) }%)`);
    }

    if (result.desktopChangedRatio > 0.12) {
      p2.push(`- ${ pageTitle }: desktop diff remains (${ formatNum(result.desktopChangedRatio * 100) }%)`);
    }

    matrixRows.push(
      `| ${ pageTitle } | ${ result.desktopPass ? 'pass' : 'fail' } | ${ result.mobilePass ? 'pass' : 'fail' } | ${
        result.loadingPass ? 'pass' : 'blocked'
      } | ${ result.passed ? 'pass' : 'fail' } |`,
    );

    metricRows.push(
      `| ${ pageKey } | ${ result.desktopScore } | ${ formatNum(result.desktopChangedRatio * 100) }% | ${
        result.mobileScore
      } | ${ formatNum(result.mobileChangedRatio * 100) }% | ${ runtimeRoutes[pageKey] ?? 'N/A' } |`,
    );
  }

  const strictResult = passCount === PAGES.length ? 'PASS' : 'FAIL';

  const report = `# Seth Strict Design Audit

## 1. Scope
- generated_at: \`${ generatedAt }\`
- design_base: \`${ DESIGN_BASE_URL }\`
- runtime_base: \`${ inferredRuntimeBase }\`
- thresholds: desktop >= ${ DESKTOP_THRESHOLD }, mobile >= ${ MOBILE_THRESHOLD }, loading_blocked=false

## 2. Summary
- strict_result: **${ strictResult }**
- pass_count: \`${ passCount }/${ PAGES.length }\`

## 3. Page Matrix
| Page | Desktop | Mobile | Loading | Result |
|---|---|---|---|---|
${ matrixRows.join('\n') }

## 4. Metrics
| Page | Desktop Score | Desktop changed_ratio | Mobile Score | Mobile changed_ratio | Final URL |
|---|---:|---:|---:|---:|---|
${ metricRows.join('\n') }

## 5. Priority Buckets
### P0
${ p0.length ? p0.join('\n') : '- none' }

### P1
${ p1.length ? p1.join('\n') : '- none' }

### P2
${ p2.length ? p2.join('\n') : '- none' }

## 6. Runtime Routes
\`\`\`json
${ JSON.stringify(runtimeRoutes, null, 2) }
\`\`\`
`;

  await fs.writeFile(DOC_PATH, `${ report }\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`[report] written ${ DOC_PATH }`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[report] failed:', error);
  process.exitCode = 1;
});
