import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, 'pages');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'qa');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'prod-route-matrix.json');

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const crawlMaxPages = Number(process.env.PROD_ROUTE_CRAWL_MAX_PAGES || 24);
const crawlMaxDepth = Number(process.env.PROD_ROUTE_CRAWL_MAX_DEPTH || 2);
const crawlTimeoutMs = Number(process.env.PROD_ROUTE_CRAWL_TIMEOUT_MS || 2_500);
const crawlMaxDurationMs = Number(process.env.PROD_ROUTE_CRAWL_MAX_DURATION_MS || 45_000);

const FALLBACK_SAMPLE = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  tx: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
  block: '1',
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

const CRAWL_SEEDS = [
  '/',
  '/blocks',
  '/txs',
  '/tokens',
  '/stats',
  '/api-docs',
  '/accounts',
  '/verified-contracts',
  '/internal-txs',
  '/token-transfers',
  '/gas-tracker',
  '/search-results?q=1',
];

function normalizeRouteFromFile(relativeFilePath) {
  const noExt = relativeFilePath.replace(/\.(tsx|ts)$/, '');
  const normalized = noExt.replace(/\\/g, '/');

  if (normalized.startsWith('api/')) {
    return null;
  }

  if (['_app', '_document', '_error', '404'].includes(normalized)) {
    return null;
  }

  if (normalized === 'index') {
    return '/';
  }

  if (normalized.endsWith('/index')) {
    return `/${normalized.slice(0, -('/index'.length))}`;
  }

  return `/${normalized}`;
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
      file: `pages/${relative.replace(/\\/g, '/')}`,
    });
  }

  return files;
}

function normalizePathname(raw) {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw, `${baseUrl}/`);
    if (url.origin !== new URL(baseUrl).origin) {
      return null;
    }

    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api/') || url.pathname === '/api') {
      return null;
    }

    const normalized = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
    if (!normalized.startsWith('/')) {
      return null;
    }

    if (normalized.endsWith('.xml') || normalized.endsWith('.ico') || normalized.endsWith('.txt')) {
      return null;
    }

    if (url.search && normalized === '/search-results') {
      return `${normalized}${url.search}`;
    }

    return normalized;
  } catch {
    return null;
  }
}

function classifyRoute(routePattern) {
  if (P0_PATTERNS.has(routePattern) || routePattern.startsWith('/block/') || routePattern.startsWith('/tx/') || routePattern.startsWith('/address/')) {
    return 'P0';
  }
  if (P1_PATTERNS.has(routePattern)) {
    return 'P1';
  }
  if (P3_PATTERNS.has(routePattern) || routePattern.startsWith('/account/') || routePattern.startsWith('/auth/')) {
    return 'P3';
  }
  if (P2_SEED.has(routePattern) || routePattern.startsWith('/chain/')) {
    return 'P2';
  }
  return 'P2';
}

function isAuthRoute(routePattern) {
  return classifyRoute(routePattern) === 'P3';
}

function toConcretePath(routePattern, sample) {
  if (!routePattern.includes('[')) {
    return routePattern;
  }

  let pathValue = routePattern;
  pathValue = pathValue.replace('[height_or_hash]', sample.block);
  pathValue = pathValue.replace('[height]', sample.number);
  pathValue = pathValue.replace('[hash]', sample.tx);
  pathValue = pathValue.replace(`/address/${sample.tx}`, `/address/${sample.address}`);
  pathValue = pathValue.replace(`/token/${sample.tx}`, `/token/${sample.token}`);
  pathValue = pathValue.replace('[id]', sample.id);
  pathValue = pathValue.replace('[number]', sample.number);
  pathValue = pathValue.replace('[slug]', sample.slug);
  pathValue = pathValue.replace('[chain_slug]', 'seth');
  pathValue = pathValue.replace('[commitment]', sample.slug);
  pathValue = pathValue.replace('[name]', sample.slug);
  pathValue = pathValue.replace(`/token/${sample.token}/instance/[id]`, `/token/${sample.token}/instance/${sample.tokenInstanceId}`);
  pathValue = pathValue.replace('/apps/[id]', `/apps/${sample.appId}`);

  return pathValue.includes('[') ? null : pathValue;
}

async function fetchJson(relativePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), crawlTimeoutMs);
  try {
    const response = await fetch(`${baseUrl}${relativePath}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickAddressFromTx(tx) {
  const candidates = [
    tx?.from?.hash,
    tx?.to?.hash,
  ];

  return candidates.find((value) => typeof value === 'string' && value.startsWith('0x'));
}

async function resolveSamples() {
  const sample = { ...FALLBACK_SAMPLE };

  const [blocks, txs, tokens] = await Promise.all([
    fetchJson('/api/v2/blocks?type=block&items_count=1'),
    fetchJson('/api/v2/transactions?items_count=1'),
    fetchJson('/api/v2/tokens?items_count=1'),
  ]);

  const topBlock = Array.isArray(blocks?.items) ? blocks.items[0] : null;
  if (typeof topBlock?.height === 'number') {
    sample.block = String(topBlock.height);
    sample.number = String(topBlock.height);
  }

  const topTx = Array.isArray(txs?.items) ? txs.items[0] : null;
  if (typeof topTx?.hash === 'string' && topTx.hash.startsWith('0x')) {
    sample.tx = topTx.hash;
  }

  const derivedAddress = pickAddressFromTx(topTx);
  if (derivedAddress) {
    sample.address = derivedAddress;
  }

  const topToken = Array.isArray(tokens?.items) ? tokens.items[0] : null;
  if (typeof topToken?.address === 'string' && topToken.address.startsWith('0x')) {
    sample.token = topToken.address;
  }

  return sample;
}

async function fetchHtml(relativePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), crawlTimeoutMs);
  const url = `${baseUrl}${relativePath}`;

  try {
    const response = await fetch(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const html = contentType.includes('text/html') ? await response.text() : '';

    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      html,
      contentType,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      html: '',
      contentType: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractLinks(html) {
  const links = new Set();
  if (!html) {
    return links;
  }

  const hrefPattern = /href=(?:"([^"]+)"|'([^']+)')/g;
  let match = hrefPattern.exec(html);
  while (match) {
    const raw = match[1] || match[2];
    const normalized = normalizePathname(raw);
    if (normalized) {
      links.add(normalized);
    }
    match = hrefPattern.exec(html);
  }
  return links;
}

async function crawlRoutes() {
  const queue = CRAWL_SEEDS.map((route) => ({ route, depth: 0 }));
  const visited = new Set();
  const discovered = new Map();
  const failures = [];
  const startedAt = Date.now();

  while (queue.length > 0 && visited.size < crawlMaxPages) {
    if (Date.now() - startedAt > crawlMaxDurationMs) {
      break;
    }

    const current = queue.shift();
    if (!current) {
      continue;
    }

    const normalizedRoute = normalizePathname(current.route);
    if (!normalizedRoute || visited.has(normalizedRoute)) {
      continue;
    }
    visited.add(normalizedRoute);

    const page = await fetchHtml(normalizedRoute);
    discovered.set(normalizedRoute, {
      route: normalizedRoute,
      depth: current.depth,
      status: page.status,
      finalUrl: page.url,
      ok: page.ok,
      error: page.error || null,
    });

    if (!page.ok && page.status >= 500) {
      failures.push({
        route: normalizedRoute,
        status: page.status,
        error: page.error || null,
      });
    }

    if (!page.contentType.includes('text/html')) {
      continue;
    }

    if (current.depth >= crawlMaxDepth) {
      continue;
    }

    const links = extractLinks(page.html);
    for (const link of links) {
      if (!visited.has(link)) {
        queue.push({
          route: link,
          depth: current.depth + 1,
        });
      }
    }
  }

  return {
    discovered: Array.from(discovered.values()),
    failures,
    visitedCount: visited.size,
    maxDurationMs: crawlMaxDurationMs,
    durationMs: Date.now() - startedAt,
  };
}

function countBy(entries, keySelector) {
  const counter = {};
  for (const entry of entries) {
    const key = keySelector(entry);
    counter[key] = (counter[key] || 0) + 1;
  }
  return counter;
}

async function run() {
  const [pageRoutesRaw, sample, crawl] = await Promise.all([
    walkPages(PAGES_DIR, PAGES_DIR),
    resolveSamples(),
    crawlRoutes(),
  ]);

  const pageRoutes = Array.from(new Map(pageRoutesRaw.map((item) => [item.routePattern, item])).values());
  const entryMap = new Map();

  for (const route of pageRoutes) {
    const concretePath = toConcretePath(route.routePattern, sample);
    entryMap.set(route.routePattern, {
      routePattern: route.routePattern,
      concretePath,
      priority: classifyRoute(route.routePattern),
      requiresAuth: isAuthRoute(route.routePattern),
      featureGated: classifyRoute(route.routePattern) === 'P2',
      source: ['pages'],
      files: [route.file],
    });
  }

  for (const crawled of crawl.discovered) {
    const routePattern = crawled.route;
    const existing = entryMap.get(routePattern);
    if (existing) {
      if (!existing.source.includes('crawl')) {
        existing.source.push('crawl');
      }
      continue;
    }

    entryMap.set(routePattern, {
      routePattern,
      concretePath: routePattern,
      priority: classifyRoute(routePattern),
      requiresAuth: isAuthRoute(routePattern),
      featureGated: classifyRoute(routePattern) === 'P2',
      source: ['crawl'],
      files: [],
    });
  }

  const entries = Array.from(entryMap.values())
    .map((entry) => ({
      ...entry,
      source: entry.source.sort(),
      files: entry.files.sort(),
    }))
    .sort((a, b) => {
      const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const prioDiff = (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99);
      if (prioDiff !== 0) {
        return prioDiff;
      }
      return a.routePattern.localeCompare(b.routePattern);
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    sample,
    coverage: {
      total: entries.length,
      byPriority: countBy(entries, (item) => item.priority),
      bySource: countBy(entries, (item) => item.source.join('+')),
      pageDiscovered: pageRoutes.length,
      crawlDiscovered: crawl.discovered.length,
      crawlVisited: crawl.visitedCount,
    },
    crawl,
    entries,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[prod-route-matrix] wrote ${OUTPUT_PATH}`);
  console.log(`[prod-route-matrix] total=${payload.coverage.total} p0=${payload.coverage.byPriority.P0 || 0} p1=${payload.coverage.byPriority.P1 || 0} p2=${payload.coverage.byPriority.P2 || 0} p3=${payload.coverage.byPriority.P3 || 0}`);
  console.log(`[prod-route-matrix] crawl pages=${crawl.discovered.length} failures=${crawl.failures.length}`);
}

await run();
