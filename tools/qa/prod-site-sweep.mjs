import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_SITE_SWEEP_TIMEOUT_MS || 8_000);
const outputDir = path.resolve(process.cwd(), 'qa-artifacts', 'prod-checks');
const matrixPath = path.resolve(process.cwd(), 'test-results', 'qa', 'prod-route-matrix.json');
const includePriorities = new Set((process.env.PROD_SITE_SWEEP_PRIORITIES || 'P0,P1,P2,P3').split(',').map((item) => item.trim()).filter(Boolean));
const maxRoutes = Number(process.env.PROD_SITE_SWEEP_MAX_ROUTES || 80);
const concurrency = Number(process.env.PROD_SITE_SWEEP_CONCURRENCY || 8);
const retries = Number(process.env.PROD_SITE_SWEEP_RETRIES || 2);

const fatalPatterns = [
  /Application error/i,
  /Unhandled Runtime Error/i,
  /Runtime capture blocked/i,
  /Failed to load static file/i,
  /502 Bad Gateway/i,
  /ChunkLoadError/i,
  /ReferenceError:/i,
];

async function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

async function ensureMatrix() {
  try {
    await readFile(matrixPath, 'utf8');
  } catch {
    await runCommand('node', [ './tools/qa/prod-route-matrix.mjs' ], {
      ...process.env,
      PROD_BASE_URL: baseUrl,
    });
  }
}

async function fetchPage(relativePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${relativePath}`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('text/html') ? await response.text() : '';

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType,
      body,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: `${baseUrl}${relativePath}`,
      contentType: '',
      body: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function isTransientError(pageResult) {
  if (pageResult.status !== 0) {
    return false;
  }

  const message = pageResult.error || '';
  return /aborted|timeout|timed out|network/i.test(message);
}

async function fetchPageWithRetry(relativePath) {
  let page = await fetchPage(relativePath);
  let attempts = 1;

  while (attempts <= retries && isTransientError(page)) {
    attempts += 1;
    // Small backoff to avoid marking temporary network stalls as hard failures.
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempts - 1)));
    page = await fetchPage(relativePath);
  }

  return { page, attempts };
}

function containsFatalText(body) {
  if (!body) {
    return null;
  }

  for (const pattern of fatalPatterns) {
    if (pattern.test(body)) {
      return pattern.source;
    }
  }

  return null;
}

function shouldIgnoreEntry(entry) {
  if (!entry.concretePath) {
    return true;
  }
  if (!includePriorities.has(entry.priority)) {
    return true;
  }
  if (entry.concretePath.startsWith('/api/')) {
    return true;
  }
  return false;
}

async function run() {
  await ensureMatrix();

  const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
  const entries = Array.isArray(matrix.entries) ? matrix.entries : [];
  const targets = entries.filter((entry) => !shouldIgnoreEntry(entry)).slice(0, maxRoutes);
  const sampledAt = new Date().toISOString();

  const checks = [];
  const errors = [];
  const warnings = [];

  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      const entry = targets[index];
      if (!entry) {
        continue;
      }

      const { page, attempts } = await fetchPageWithRetry(entry.concretePath);
      const fatalText = containsFatalText(page.body);
      const isAuth = Boolean(entry.requiresAuth);

      const hasStatusError = page.status >= 500 || page.status === 0;
      const hasFatal = Boolean(fatalText);

      if (hasStatusError) {
        errors.push(`${entry.concretePath} -> HTTP ${page.status}${page.error ? ` (${page.error})` : ''}`);
      } else if (!isAuth && hasFatal) {
        errors.push(`${entry.concretePath} contains fatal text: ${fatalText}`);
      } else if (isAuth && hasFatal) {
        warnings.push(`${entry.concretePath} auth page includes marker: ${fatalText}`);
      }

      checks.push({
        routePattern: entry.routePattern,
        concretePath: entry.concretePath,
        priority: entry.priority,
        requiresAuth: isAuth,
        status: page.status,
        attempts,
        finalUrl: page.finalUrl,
        contentType: page.contentType,
        fatalText,
        error: page.error,
      });
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  const report = {
    generatedAt: sampledAt,
    baseUrl,
    includePriorities: Array.from(includePriorities.values()),
    matrixPath,
    totals: {
      entries: entries.length,
      checked: checks.length,
      maxRoutes,
      concurrency,
      retries,
      errors: errors.length,
      warnings: warnings.length,
    },
    checks,
    errors,
    warnings,
  };

  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `site-sweep-${sampledAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

  const status = errors.length > 0 ? 'FAIL' : 'PASS';
  console.log(`[prod-site-sweep] ${status} -> ${outputPath}`);
  console.log(`[prod-site-sweep] checked=${checks.length} warnings=${warnings.length} errors=${errors.length}`);

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`- WARN ${warning}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  }
}

await run();
