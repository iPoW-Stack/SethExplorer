import { spawn } from 'node:child_process';
import path from 'node:path';

import { ensureRuntimeServer } from '../shared/ensure-runtime-server.mjs';

const PLAYWRIGHT_CONFIG = 'playwright-e2e.config.ts';
const DEFAULT_FALLBACK_PORTS = [ 8090, 8080, 8095, 8096 ];

function resolveRequestedBaseUrl() {
  if (process.env.E2E_BASE_URL) {
    return process.env.E2E_BASE_URL;
  }

  if (process.env.RUNTIME_BASE_URL) {
    return process.env.RUNTIME_BASE_URL;
  }

  return `http://localhost:${ process.env.NEXT_PUBLIC_APP_PORT || '8090' }`;
}

function runPlaywright({ baseUrl, args }) {
  const playwrightCli = path.join(process.cwd(), 'node_modules', 'playwright', 'cli.js');
  const env = {
    ...process.env,
    E2E_BASE_URL: baseUrl,
    NEXT_PUBLIC_SETH_STRICT_MODE: process.env.NEXT_PUBLIC_SETH_STRICT_MODE || 'true',
    NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE: process.env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE || 'live',
    NEXT_DISABLE_WEBPACK_CACHE: '1',
  };

  const child = spawn(
    process.execPath,
    [ playwrightCli, 'test', '-c', PLAYWRIGHT_CONFIG, ...args ],
    {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    },
  );

  const terminate = () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
    }
  };

  process.on('SIGINT', terminate);
  process.on('SIGTERM', terminate);

  return new Promise((resolve) => {
    child.on('exit', (code) => {
      process.off('SIGINT', terminate);
      process.off('SIGTERM', terminate);
      resolve(code ?? 1);
    });
  });
}

async function run() {
  const args = process.argv.slice(2);
  const requestedBaseUrl = resolveRequestedBaseUrl();
  const strictDataSource = process.env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE || 'live';
  let runtimeServer;

  try {
    runtimeServer = await ensureRuntimeServer({
      baseUrl: requestedBaseUrl,
      strictMode: true,
      strictDataSource,
      fallbackPorts: DEFAULT_FALLBACK_PORTS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[e2e-live] runtime bootstrap failed: ${ message }`);
    process.exitCode = 1;
    return;
  }

  const effectiveBaseUrl = runtimeServer.baseUrl;
  if (runtimeServer.started) {
    console.log(`[e2e-live] started runtime pid=${ runtimeServer.pid } base=${ effectiveBaseUrl }`);
  } else if (effectiveBaseUrl !== requestedBaseUrl) {
    console.log(`[e2e-live] reusing runtime base=${ effectiveBaseUrl }`);
  }

  try {
    const exitCode = await runPlaywright({ baseUrl: effectiveBaseUrl, args });
    process.exitCode = exitCode;
  } finally {
    await runtimeServer.stop?.();
  }
}

await run();
