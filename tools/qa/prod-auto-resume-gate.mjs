#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const baseUrl = process.env.PROD_BASE_URL || process.env.E2E_BASE_URL || 'https://explorer.seth.app';
const pollIntervalMs = Number(process.env.PROD_RESUME_POLL_MS || 60_000);
const timeoutMs = Number(process.env.PROD_RESUME_TIMEOUT_MS || 7_200_000);
const strictRounds = Number(process.env.PROD_UI_FULL_ROUNDS || 3);
const artifactDir = path.join(
  rootDir,
  'qa-artifacts',
  'prod-auto-resume',
  new Date().toISOString().replace(/[:.]/g, '-'),
);

fs.mkdirSync(artifactDir, { recursive: true });

function runCommand(command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, {
    cwd: rootDir,
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PROD_BASE_URL: baseUrl,
      E2E_BASE_URL: baseUrl,
    },
  });
  const endedAt = new Date().toISOString();
  return {
    command,
    status: result.status ?? 1,
    startedAt,
    endedAt,
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  console.log(`[prod-auto-resume] base=${ baseUrl } timeoutMs=${ timeoutMs } pollMs=${ pollIntervalMs }`);
  const started = Date.now();
  const attempts = [];

  while (Date.now() - started < timeoutMs) {
    const attemptId = attempts.length + 1;
    console.log(`\n[prod-auto-resume] attempt ${ attemptId }`);
    const freshness = runCommand('yarn qa:prod:data-freshness');
    attempts.push({
      attemptId,
      freshness,
    });

    if (freshness.status === 0) {
      console.log('[prod-auto-resume] strict data freshness passed, start strict full UI loop');
      const strictLoop = runCommand(`yarn qa:prod:ui-full:3x`);
      attempts[attempts.length - 1].strictLoop = strictLoop;

      const summary = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        strictRounds,
        status: strictLoop.status === 0 ? 'passed' : 'failed',
        attempts,
      };
      fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${ JSON.stringify(summary, null, 2) }\n`, 'utf8');

      if (strictLoop.status !== 0) {
        process.exit(strictLoop.status);
      }

      console.log(`[prod-auto-resume] PASS artifact=${ artifactDir }`);
      return;
    }

    console.log(`[prod-auto-resume] freshness not ready, wait ${ pollIntervalMs / 1000 }s`);
    // eslint-disable-next-line no-await-in-loop
    await sleep(pollIntervalMs);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    strictRounds,
    status: 'timeout',
    attempts,
  };
  fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${ JSON.stringify(summary, null, 2) }\n`, 'utf8');
  console.error(`[prod-auto-resume] timeout after ${ timeoutMs / 1000 }s artifact=${ artifactDir }`);
  process.exit(1);
}

main().catch((error) => {
  console.error('[prod-auto-resume] ERROR', error);
  process.exit(1);
});
