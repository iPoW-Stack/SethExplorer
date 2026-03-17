#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rounds = Number(process.env.PROD_UI_FULL_ROUNDS || 3);
const allowChainPause = process.env.PROD_ALLOW_CHAIN_PAUSE === 'true' || process.argv.includes('--allow-chain-pause');
const rootDir = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(rootDir, 'qa-artifacts', 'prod-ui-full-loop', stamp);

const commands = [
  'yarn qa:prod:route-matrix',
  'yarn qa:prod:site-sweep',
  'yarn qa:prod:data-freshness',
  'yarn qa:prod:branding',
  'yarn qa:prod:ui-recommendations',
  'yarn test:e2e:prod-fullsite',
];

fs.mkdirSync(artifactDir, { recursive: true });

const roundResults = [];

for (let round = 1; round <= rounds; round += 1) {
  console.log(`\n[prod-ui-full-loop] round ${ round }/${ rounds }`);
  const commandResults = [];

  for (const command of commands) {
    console.log(`[prod-ui-full-loop] run: ${ command }`);
    const startedAt = new Date().toISOString();
    const result = spawnSync(command, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        ...(allowChainPause ? { PROD_ALLOW_CHAIN_PAUSE: 'true' } : {}),
      },
    });

    const endedAt = new Date().toISOString();
    const status = result.status ?? 1;
    commandResults.push({ command, status, startedAt, endedAt });

    if (status !== 0) {
      roundResults.push({
        round,
        status: 'failed',
        commands: commandResults,
      });

      const payload = {
        generatedAt: new Date().toISOString(),
        rounds,
        roundResults,
      };
      fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${ JSON.stringify(payload, null, 2) }\n`, 'utf8');
      console.error(`[prod-ui-full-loop] failed at round ${ round }: ${ command }`);
      process.exit(status);
    }
  }

  roundResults.push({
    round,
    status: 'passed',
    commands: commandResults,
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  rounds,
  roundResults,
};

fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${ JSON.stringify(summary, null, 2) }\n`, 'utf8');
console.log(`[prod-ui-full-loop] PASS rounds=${ rounds } artifact=${ artifactDir }`);
