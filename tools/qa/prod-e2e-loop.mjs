import { cp, mkdir, access, constants, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const rounds = Number(process.env.PROD_E2E_ROUNDS || 3);
const baseUrl = process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app';
const outputRoot = path.resolve(process.cwd(), 'qa-artifacts', 'prod-e2e-loop', new Date().toISOString().replace(/[:.]/g, '-'));
const playwrightReportDir = path.resolve(process.cwd(), 'playwright-report');
const testResultsDir = path.resolve(process.cwd(), 'test-results');

const yarnCmd = 'yarn';

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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
        reject(new Error(`${ command } ${ args.join(' ') } exited with code ${ code }`));
      }
    });
  });
}

async function copyDirIfExists(sourceDir, targetDir) {
  if (await pathExists(sourceDir)) {
    await cp(sourceDir, targetDir, { recursive: true });
    return true;
  }
  return false;
}

await mkdir(outputRoot, { recursive: true });
console.log(`[prod-e2e-loop] base=${ baseUrl } rounds=${ rounds } output=${ outputRoot }`);

let failedRound = null;
const roundReports = [];
for (let index = 1; index <= rounds; index += 1) {
  const roundTag = `round-${ String(index).padStart(2, '0') }`;
  const roundDir = path.join(outputRoot, roundTag);
  await mkdir(roundDir, { recursive: true });

  console.log(`[prod-e2e-loop] start ${ roundTag }`);
  const startedAt = new Date().toISOString();
  let roundError = null;

  try {
    await runCommand(yarnCmd, [ 'test:e2e:full:live' ], {
      ...process.env,
      E2E_BASE_URL: baseUrl,
    });
  } catch (error) {
    roundError = error instanceof Error ? error.message : String(error);
    failedRound = {
      round: index,
      message: roundError,
    };
  }

  const copiedPlaywright = await copyDirIfExists(playwrightReportDir, path.join(roundDir, 'playwright-report'));
  const copiedTestResults = await copyDirIfExists(testResultsDir, path.join(roundDir, 'test-results'));
  console.log(`[prod-e2e-loop] archived ${ roundTag } playwright=${ copiedPlaywright } test-results=${ copiedTestResults }`);
  roundReports.push({
    round: index,
    startedAt,
    endedAt: new Date().toISOString(),
    ok: !roundError,
    error: roundError,
    archived: {
      playwright: copiedPlaywright,
      testResults: copiedTestResults,
    },
  });

  if (failedRound) {
    break;
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  roundsRequested: rounds,
  failedRound,
  rounds: roundReports,
};
await writeFile(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

if (failedRound) {
  console.error(`[prod-e2e-loop] FAIL at round=${ failedRound.round } reason=${ failedRound.message }`);
  console.error(`[prod-e2e-loop] summary=${ path.join(outputRoot, 'summary.json') }`);
  process.exitCode = 1;
} else {
  console.log(`[prod-e2e-loop] PASS all rounds summary=${ path.join(outputRoot, 'summary.json') }`);
}
