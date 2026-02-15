import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'pages');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'qa');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'route-inventory.json');

const SAMPLE = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  tx: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
  block: '18249102',
  token: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  tokenInstanceId: '1',
  appId: '1',
  slug: 'sample',
  number: '1',
  id: '1',
};

const P0_PATTERNS = new Set([
  '/',
  '/blocks',
  '/txs',
  '/block/[height_or_hash]',
  '/tx/[hash]',
  '/address/[hash]',
  '/search-results',
]);

const P1_PATTERNS = new Set([
  '/tokens',
  '/token/[hash]',
  '/token-transfers',
  '/internal-txs',
  '/verified-contracts',
  '/accounts',
  '/api-docs',
  '/stats',
  '/gas-tracker',
  '/csv-export',
]);

const P3_PATTERNS = new Set([
  '/login',
  '/auth/profile',
  '/account/api-key',
  '/account/custom-abi',
  '/account/merits',
  '/account/tag-address',
  '/account/verified-addresses',
  '/account/watchlist',
]);

const P2_SEED = new Set([
  '/apps',
  '/batches',
  '/blobs/[hash]',
  '/deposits',
  '/dispute-games',
  '/epochs',
  '/essential-dapps/[id]',
  '/hot-contracts',
  '/interop-messages',
  '/mud-worlds',
  '/name-services',
  '/operations',
  '/ops',
  '/output-roots',
  '/pools',
  '/txn-withdrawals',
  '/validators',
  '/withdrawals',
]);

function normalizeRouteFromFile(relativeFilePath) {
  const noExt = relativeFilePath.replace(/\.(tsx|ts)$/, '');
  const normalized = noExt.replace(/\\/g, '/');

  if (normalized.startsWith('api/')) {
    return null;
  }

  if ([ '_app', '_document', '_error', '404' ].includes(normalized)) {
    return null;
  }

  if (normalized === 'index') {
    return '/';
  }

  if (normalized.endsWith('/index')) {
    return `/${ normalized.slice(0, -('/index'.length)) }`;
  }

  return `/${ normalized }`;
}

async function walkPages(dirPath, baseDir) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkPages(fullPath, baseDir));
      continue;
    }

    if (!/\.(tsx|ts)$/.test(entry.name)) {
      continue;
    }

    const relative = path.relative(baseDir, fullPath);
    const routePattern = normalizeRouteFromFile(relative);
    if (!routePattern) {
      continue;
    }

    files.push({
      routePattern,
      file: `pages/${ relative.replace(/\\/g, '/') }`,
    });
  }

  return files;
}

function toConcretePath(routePattern) {
  if (!routePattern.includes('[')) {
    return routePattern;
  }

  let pathValue = routePattern;
  pathValue = pathValue.replace('[height_or_hash]', SAMPLE.block);
  pathValue = pathValue.replace('[height]', SAMPLE.number);
  pathValue = pathValue.replace('[hash]', SAMPLE.tx);
  pathValue = pathValue.replace('/address/' + SAMPLE.tx, `/address/${ SAMPLE.address }`);
  pathValue = pathValue.replace('/token/' + SAMPLE.tx, `/token/${ SAMPLE.token }`);
  pathValue = pathValue.replace('[id]', SAMPLE.id);
  pathValue = pathValue.replace('[number]', SAMPLE.number);
  pathValue = pathValue.replace('[slug]', SAMPLE.slug);
  pathValue = pathValue.replace('[chain_slug]', 'seth');
  pathValue = pathValue.replace('[commitment]', SAMPLE.slug);
  pathValue = pathValue.replace('[name]', SAMPLE.slug);

  // Route with double dynamic segments under token instance page.
  pathValue = pathValue.replace(`/token/${ SAMPLE.token }/instance/[id]`, `/token/${ SAMPLE.token }/instance/${ SAMPLE.tokenInstanceId }`);
  pathValue = pathValue.replace('/apps/[id]', `/apps/${ SAMPLE.appId }`);

  return pathValue.includes('[') ? null : pathValue;
}

function classifyRoute(routePattern) {
  if (P0_PATTERNS.has(routePattern)) {
    return 'P0';
  }
  if (P1_PATTERNS.has(routePattern)) {
    return 'P1';
  }
  if (P3_PATTERNS.has(routePattern) || routePattern.startsWith('/account/')) {
    return 'P3';
  }
  if (P2_SEED.has(routePattern)) {
    return 'P2';
  }
  if (routePattern.startsWith('/chain/')) {
    return 'P2';
  }
  return 'P2';
}

function buildGroupNotes() {
  return {
    P0: 'Core anonymous critical paths. Must pass for functional gate.',
    P1: 'High-frequency public pages. Must pass unless blocked by backend incidents with evidence.',
    P2: 'Feature/chain-dependent public pages. Execute when route is enabled and accessible.',
    P3: 'Auth/account pages without credentials. Guard/error behavior only in this round.',
  };
}

async function run() {
  const discovered = await walkPages(PAGES_DIR, PAGES_DIR);
  const unique = Array
    .from(new Map(discovered.map((entry) => [ entry.routePattern, entry ])).values())
    .sort((a, b) => a.routePattern.localeCompare(b.routePattern));

  const groups = {
    P0: [],
    P1: [],
    P2: [],
    P3: [],
  };

  for (const routeEntry of unique) {
    const priority = classifyRoute(routeEntry.routePattern);
    groups[priority].push({
      routePattern: routeEntry.routePattern,
      concretePath: toConcretePath(routeEntry.routePattern),
      file: routeEntry.file,
      requiresAuth: priority === 'P3',
      featureGated: priority === 'P2',
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: {
      strictMode: process.env.NEXT_PUBLIC_SETH_STRICT_MODE ?? 'true',
      strictDataSource: process.env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE ?? 'live',
    },
    source: {
      pagesDir: 'pages',
      discoveredRoutes: unique.length,
    },
    notes: buildGroupNotes(),
    groups,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[route-inventory] wrote ${ OUTPUT_PATH }`);
  console.log(`[route-inventory] counts P0=${ groups.P0.length } P1=${ groups.P1.length } P2=${ groups.P2.length } P3=${ groups.P3.length }`);
}

await run();
