import { execFile, spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const LOCAL_HOSTS = new Set([ 'localhost', '127.0.0.1', '::1' ]);
const DEFAULT_FALLBACK_PORTS = [ 8095, 8096, 8097, 8098 ];
const MAX_LOG_CHARS = 4_000;

export async function isUrlReachable(url, timeoutMs = 3_000) {
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

function normalizePort(value) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return null;
  }
  return String(asNumber);
}

function withPort(baseUrl, port) {
  const nextUrl = new URL(baseUrl);
  nextUrl.port = port;
  nextUrl.pathname = '/';
  nextUrl.search = '';
  nextUrl.hash = '';
  return nextUrl.toString();
}

async function isPortListening(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host,
      port: Number(port),
      family: host.includes(':') ? 6 : 0,
    });

    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(800);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  for (let index = 0; index < 12; index += 1) {
    if (child.exitCode !== null) {
      return;
    }
    await sleep(250);
  }

  if (child.exitCode !== null || !child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    await execFileAsync('taskkill', [ '/PID', String(child.pid), '/T', '/F' ]).catch(() => null);
    return;
  }

  child.kill('SIGKILL');
}

function appendLog(logs, chunk) {
  const nextLogs = `${ logs }${ chunk.toString() }`;
  if (nextLogs.length <= MAX_LOG_CHARS) {
    return nextLogs;
  }

  return nextLogs.slice(-MAX_LOG_CHARS);
}

async function bootServer({ baseUrl, port, env, startupTimeoutMs, pingTimeoutMs }) {
  const nextBinPath = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [ nextBinPath, 'dev', '-p', port ], {
    cwd: process.cwd(),
    env,
    stdio: [ 'ignore', 'pipe', 'pipe' ],
  });

  let logs = '';
  let exited = false;
  let exitCode = 0;

  child.stdout.on('data', (chunk) => {
    logs = appendLog(logs, chunk);
  });
  child.stderr.on('data', (chunk) => {
    logs = appendLog(logs, chunk);
  });
  child.once('exit', (code) => {
    exited = true;
    exitCode = code ?? 0;
  });

  const deadline = Date.now() + startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isUrlReachable(baseUrl, pingTimeoutMs)) {
      return {
        ok: true,
        pid: child.pid ?? null,
        stop: async() => {
          await stopProcessTree(child);
        },
      };
    }

    if (exited) {
      const logTail = logs.trim() ? `; log tail: ${ logs.trim() }` : '';
      return { ok: false, reason: `process exited (code ${ exitCode })${ logTail }` };
    }

    await sleep(1_000);
  }

  await stopProcessTree(child);
  const logTail = logs.trim() ? `; log tail: ${ logs.trim() }` : '';
  return { ok: false, reason: `startup timed out after ${ startupTimeoutMs }ms${ logTail }` };
}

export async function ensureRuntimeServer({
  baseUrl,
  startupTimeoutMs = 240_000,
  pingTimeoutMs = 3_000,
  strictMode,
  strictDataSource,
  fallbackPorts = DEFAULT_FALLBACK_PORTS,
} = {}) {
  if (!baseUrl) {
    throw new Error('Missing required baseUrl for ensureRuntimeServer');
  }

  const parsedBaseUrl = new URL(baseUrl);
  const isLocalHost = LOCAL_HOSTS.has(parsedBaseUrl.hostname);

  if (await isUrlReachable(baseUrl, pingTimeoutMs)) {
    return {
      started: false,
      baseUrl,
      stop: async() => {},
    };
  }

  if (!isLocalHost) {
    throw new Error(`Runtime server is unreachable: ${ baseUrl }`);
  }

  const requestedPort = normalizePort(parsedBaseUrl.port || (parsedBaseUrl.protocol === 'https:' ? '443' : '80'));
  const portCandidates = [ requestedPort, ...fallbackPorts.map(normalizePort) ]
    .filter(Boolean)
    .filter((port, index, list) => list.indexOf(port) === index);
  const errors = [];

  for (const port of portCandidates) {
    const candidateBaseUrl = withPort(baseUrl, port);

    if (await isUrlReachable(candidateBaseUrl, pingTimeoutMs)) {
      return {
        started: false,
        baseUrl: candidateBaseUrl,
        stop: async() => {},
      };
    }

    const portBusy = await isPortListening(parsedBaseUrl.hostname, port);
    if (portBusy) {
      errors.push(`port ${ port } is occupied and ${ candidateBaseUrl } is not healthy`);
      continue;
    }

    const env = {
      ...process.env,
      NEXT_PUBLIC_APP_PORT: port,
    };

    if (strictMode !== undefined && env.NEXT_PUBLIC_SETH_STRICT_MODE === undefined) {
      env.NEXT_PUBLIC_SETH_STRICT_MODE = strictMode ? 'true' : 'false';
    }

    if (strictDataSource && env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE === undefined) {
      env.NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE = strictDataSource;
    }

    const startResult = await bootServer({
      baseUrl: candidateBaseUrl,
      port,
      env,
      startupTimeoutMs,
      pingTimeoutMs,
    });

    if (startResult.ok) {
      return {
        started: true,
        baseUrl: candidateBaseUrl,
        pid: startResult.pid,
        stop: startResult.stop,
      };
    }

    errors.push(`port ${ port }: ${ startResult.reason }`);
  }

  throw new Error(`Failed to start runtime server for ${ baseUrl }. ${ errors.join(' | ') }`);
}
