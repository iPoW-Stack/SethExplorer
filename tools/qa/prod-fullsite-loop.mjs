import { access, constants, cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rounds = Number(process.env.PROD_E2E_ROUNDS || 3);
const baseUrl = process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app';
const allowChainPause = process.env.PROD_ALLOW_CHAIN_PAUSE === 'true' || process.argv.includes('--allow-chain-pause');
const outputRoot = path.resolve(process.cwd(), 'qa-artifacts', 'prod-fullsite-loop', new Date().toISOString().replace(/[:.]/g, '-'));
const playwrightReportDir = path.resolve(process.cwd(), 'playwright-report');
const testResultsDir = path.resolve(process.cwd(), 'test-results');

const commandChain = [
  [ 'node', [ './tools/qa/prod-runtime-config-check.mjs' ] ],
  [ 'node', [ './tools/qa/prod-api-contract.mjs' ] ],
  [ 'node', [ './tools/qa/prod-route-matrix.mjs' ] ],
  [ 'node', [ './tools/qa/prod-site-sweep.mjs' ] ],
  [ 'node', [ './tools/qa/prod-data-freshness.mjs' ] ],
  [ 'node', [ './tools/qa/prod-branding-check.mjs' ] ],
  [ 'yarn', [ 'test:e2e:prod-fullsite' ] ],
];

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyDirIfExists(sourceDir, targetDir) {
  if (!await pathExists(sourceDir)) {
    return false;
  }
  await cp(sourceDir, targetDir, { recursive: true });
  return true;
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

await mkdir(outputRoot, { recursive: true });
console.log(`[prod-fullsite-loop] base=${baseUrl} rounds=${rounds} allowChainPause=${allowChainPause} output=${outputRoot}`);

const roundsReport = [];
let failedRound = null;

for (let index = 1; index <= rounds; index += 1) {
  const roundTag = `round-${String(index).padStart(2, '0')}`;
  const roundDir = path.join(outputRoot, roundTag);
  await mkdir(roundDir, { recursive: true });

  const report = {
    round: index,
    startedAt: new Date().toISOString(),
    endedAt: null,
    ok: true,
    failedCommand: null,
    error: null,
    archived: {
      playwright: false,
      testResults: false,
    },
  };

  console.log(`[prod-fullsite-loop] start ${roundTag}`);

  for (const [command, args] of commandChain) {
    try {
      await runCommand(command, args, {
        ...process.env,
        PROD_BASE_URL: baseUrl,
        E2E_BASE_URL: baseUrl,
        ...(allowChainPause ? { PROD_ALLOW_CHAIN_PAUSE: 'true' } : {}),
      });
    } catch (error) {
      report.ok = false;
      report.failedCommand = `${command} ${args.join(' ')}`;
      report.error = error instanceof Error ? error.message : String(error);
      failedRound = {
        round: index,
        message: report.error,
        command: report.failedCommand,
      };
      break;
    }
  }

  report.archived.playwright = await copyDirIfExists(playwrightReportDir, path.join(roundDir, 'playwright-report'));
  report.archived.testResults = await copyDirIfExists(testResultsDir, path.join(roundDir, 'test-results'));
  report.endedAt = new Date().toISOString();
  roundsReport.push(report);

  if (failedRound) {
    break;
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  roundsRequested: rounds,
  failedRound,
  rounds: roundsReport,
};

await writeFile(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

if (failedRound) {
  console.error(`[prod-fullsite-loop] FAIL round=${failedRound.round} command=${failedRound.command} reason=${failedRound.message}`);
  process.exitCode = 1;
} else {
  console.log(`[prod-fullsite-loop] PASS all rounds summary=${path.join(outputRoot, 'summary.json')}`);
}
