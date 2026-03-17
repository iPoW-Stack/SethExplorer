import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');
const timeoutMs = Number(process.env.PROD_CHECK_TIMEOUT_MS || 20_000);
const outputDir = path.resolve(process.cwd(), 'qa-artifacts', 'prod-checks');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function parseEnvJs(body) {
  const config = {};
  const pattern = /([A-Z0-9_]+)\s*:\s*\"([^\"]*)\"/g;
  let match = pattern.exec(body);
  while (match) {
    config[match[1]] = match[2];
    match = pattern.exec(body);
  }
  return config;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${url} -> HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  checks: {},
  warnings: [],
  errors: [],
};

try {
  const envJs = await fetchText(`${baseUrl}/assets/envs.js`);
  const cfg = parseEnvJs(envJs);

  report.checks.runtimeConfig = {
    NEXT_PUBLIC_API_HOST: cfg.NEXT_PUBLIC_API_HOST ?? null,
    NEXT_PUBLIC_API_PROTOCOL: cfg.NEXT_PUBLIC_API_PROTOCOL ?? null,
    NEXT_PUBLIC_SETH_STRICT_MODE: cfg.NEXT_PUBLIC_SETH_STRICT_MODE ?? null,
    NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE: cfg.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE ?? null,
    NEXT_PUBLIC_STATS_SERVICE_ENABLED: cfg.NEXT_PUBLIC_STATS_SERVICE_ENABLED ?? null,
  };

  if (!cfg.NEXT_PUBLIC_API_HOST || !cfg.NEXT_PUBLIC_API_HOST.includes('explorer.seth.app')) {
    report.errors.push(`NEXT_PUBLIC_API_HOST invalid: ${cfg.NEXT_PUBLIC_API_HOST || 'missing'}`);
  }

  if (cfg.NEXT_PUBLIC_API_PROTOCOL !== 'https') {
    report.errors.push(`NEXT_PUBLIC_API_PROTOCOL must be https, got: ${cfg.NEXT_PUBLIC_API_PROTOCOL || 'missing'}`);
  }

  if (cfg.NEXT_PUBLIC_SETH_STRICT_MODE !== 'true') {
    report.errors.push(`NEXT_PUBLIC_SETH_STRICT_MODE must be true, got: ${cfg.NEXT_PUBLIC_SETH_STRICT_MODE || 'missing'}`);
  }

  if (cfg.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE !== 'live') {
    report.errors.push(`NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE must be live, got: ${cfg.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE || 'missing'}`);
  }

  if (typeof cfg.NEXT_PUBLIC_API_HOST === 'string' && /blockscout\.com/i.test(cfg.NEXT_PUBLIC_API_HOST)) {
    report.errors.push(`runtime API host still points to blockscout domain: ${cfg.NEXT_PUBLIC_API_HOST}`);
  }

  if (typeof envJs === 'string' && /eth-sepolia\.k8s-dev\.blockscout\.com/i.test(envJs)) {
    report.warnings.push('envs.js still contains eth-sepolia.k8s-dev.blockscout.com in non-primary fields');
  }
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `runtime-config-${stamp}.json`);
await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');

const status = report.errors.length > 0 ? 'FAIL' : 'PASS';
console.log(`[prod-runtime-config-check] ${status} -> ${outputPath}`);

if (report.warnings.length > 0) {
  console.log(`[prod-runtime-config-check] warnings=${report.warnings.length}`);
  for (const warning of report.warnings) {
    console.log(`- ${warning}`);
  }
}

if (report.errors.length > 0) {
  console.error(`[prod-runtime-config-check] errors=${report.errors.length}`);
  for (const error of report.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}
