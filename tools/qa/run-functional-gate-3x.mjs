import { spawn } from 'node:child_process';
import { access, cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ARCHIVE_ROOT = path.join(ROOT, 'qa-artifacts', 'functional-gate-runs');
const SNAPSHOT_DIRS = [ 'playwright-report', 'test-results' ];

function parseNumberArg(args, name, fallback) {
  const prefix = `--${ name }=`;
  const value = args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid value for --${ name }: ${ value }`);
  }
  return Math.floor(parsed);
}

function parseArgs(rawArgs) {
  return {
    rounds: parseNumberArg(rawArgs, 'rounds', 3),
    startIndex: parseNumberArg(rawArgs, 'start-index', 1),
  };
}

function toFileSafeTimestamp(value = new Date()) {
  return value.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function snapshotRoundArtifacts(runDir) {
  await mkdir(runDir, { recursive: true });

  for (const dirName of SNAPSHOT_DIRS) {
    const sourcePath = path.join(ROOT, dirName);
    if (!await pathExists(sourcePath)) {
      continue;
    }

    const targetPath = path.join(runDir, dirName);
    await cp(sourcePath, targetPath, { recursive: true, force: true });
  }
}

function runQaGate() {
  const child = process.platform === 'win32' ?
    spawn('cmd.exe', [ '/d', '/s', '/c', 'yarn qa:functional:full' ], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
      shell: false,
    }) :
    spawn('yarn', [ 'qa:functional:full' ], {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
      shell: false,
    });

  return new Promise((resolve) => {
    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const batchId = toFileSafeTimestamp();
  const batchDir = path.join(ARCHIVE_ROOT, batchId);
  const summaryPath = path.join(batchDir, 'summary.json');
  const rounds = [];

  await mkdir(batchDir, { recursive: true });
  console.log(`[functional-gate-3x] batch=${ batchId } rounds=${ args.rounds } startIndex=${ args.startIndex }`);

  for (let offset = 0; offset < args.rounds; offset += 1) {
    const roundNumber = args.startIndex + offset;
    const startedAt = new Date();
    console.log(`[functional-gate-3x] round ${ roundNumber } started at ${ startedAt.toISOString() }`);

    const exitCode = await runQaGate();
    const finishedAt = new Date();

    const roundId = `round-${ String(roundNumber).padStart(2, '0') }-${ toFileSafeTimestamp(finishedAt) }`;
    const roundDir = path.join(batchDir, roundId);
    await snapshotRoundArtifacts(roundDir);

    const roundSummary = {
      roundNumber,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      exitCode,
      archiveDir: path.relative(ROOT, roundDir).replaceAll('\\', '/'),
      status: exitCode === 0 ? 'passed' : 'failed',
    };
    rounds.push(roundSummary);

    console.log(`[functional-gate-3x] round ${ roundNumber } ${ roundSummary.status }`);

    if (exitCode !== 0) {
      break;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    requested: {
      rounds: args.rounds,
      startIndex: args.startIndex,
    },
    completedRounds: rounds.length,
    allPassed: rounds.every((round) => round.exitCode === 0) && rounds.length === args.rounds,
    rounds,
  };

  await writeFile(summaryPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[functional-gate-3x] summary=${ path.relative(ROOT, summaryPath).replaceAll('\\', '/') }`);

  if (!payload.allPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[functional-gate-3x] failed: ${ message }`);
  process.exitCode = 1;
});
