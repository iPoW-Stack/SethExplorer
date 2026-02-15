import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

import { warmupRuntimeRoutes } from './warmup-runtime-routes.mjs';

const DEFAULT_PORT = process.env.NEXT_PUBLIC_APP_PORT || '8080';
const DEFAULT_BASE_URL = process.env.RUNTIME_BASE_URL || process.env.E2E_BASE_URL || `http://localhost:${ DEFAULT_PORT }`;
const STARTUP_TIMEOUT_MS = Number(process.env.DEV_READY_STARTUP_TIMEOUT_MS || 300_000);
const PING_TIMEOUT_MS = Number(process.env.DEV_READY_PING_TIMEOUT_MS || 3_000);

async function isUrlReachable(url, timeoutMs = PING_TIMEOUT_MS) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

function spawnDetachedDev() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : 'sh';
  const args = isWindows ? [ '/c', 'yarn dev' ] : [ '-lc', 'yarn dev' ];

  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  return child.pid ?? null;
}

async function waitForRuntime(url) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const ready = await isUrlReachable(url);
    if (ready) {
      return true;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(1_000);
  }

  return false;
}

async function main() {
  const baseUrl = DEFAULT_BASE_URL;
  let startedPid = null;

  const alreadyRunning = await isUrlReachable(baseUrl);
  if (!alreadyRunning) {
    startedPid = spawnDetachedDev();
    if (startedPid) {
      console.log(`[dev-ready] started dev server pid=${ startedPid }`);
    } else {
      console.log('[dev-ready] started dev server');
    }
  } else {
    console.log(`[dev-ready] reusing running dev server at ${ baseUrl }`);
  }

  const ready = await waitForRuntime(baseUrl);
  if (!ready) {
    console.error(`[dev-ready] runtime did not become healthy within ${ STARTUP_TIMEOUT_MS }ms at ${ baseUrl }`);
    process.exitCode = 1;
    return;
  }

  const { failed } = await warmupRuntimeRoutes({
    baseUrl,
    logPrefix: '[dev-ready:warmup]',
  });

  if (failed.length > 0) {
    console.error('[dev-ready] warmup finished with failures; check server logs before manual QA');
    process.exitCode = 1;
    return;
  }

  console.log(`[dev-ready] READY ${ baseUrl }`);
  console.log('[dev-ready] You can start manual testing now.');
}

await main();
