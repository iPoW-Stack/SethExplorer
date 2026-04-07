#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const cjkPattern = /\p{Script=Han}/u;

function getTrackedFiles() {
  const output = execFileSync('git', [ 'ls-files', '-z' ], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: [ 'ignore', 'pipe', 'pipe' ],
  });

  return output.split('\0').filter(Boolean);
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function findFirstHanLine(source) {
  const lines = source.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    if (cjkPattern.test(lines[index])) {
      return {
        line: index + 1,
        text: lines[index].trim().slice(0, 160),
      };
    }
  }

  return null;
}

function main() {
  const offenders = [];
  const trackedFiles = getTrackedFiles();

  for (const relativePath of trackedFiles) {
    if (cjkPattern.test(relativePath)) {
      offenders.push({
        path: relativePath,
        reason: 'CJK characters found in file path',
      });
      continue;
    }

    const absolutePath = path.join(rootDir, relativePath);
    const buffer = fs.readFileSync(absolutePath);

    if (isBinary(buffer)) {
      continue;
    }

    const source = buffer.toString('utf8');
    const match = findFirstHanLine(source);

    if (match) {
      offenders.push({
        path: relativePath,
        reason: `CJK characters found at line ${ match.line }`,
        sample: match.text,
      });
    }
  }

  if (offenders.length > 0) {
    console.error('[no-cjk] FAIL');

    for (const offender of offenders) {
      console.error(`- ${ offender.path }: ${ offender.reason }`);
      if (offender.sample) {
        console.error(`  sample: ${ offender.sample }`);
      }
    }

    process.exit(1);
  }

  console.log('[no-cjk] PASS');
}

main();
