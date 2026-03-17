#!/usr/bin/env node

/**
 * Scan production pages + loaded chunks for user-visible Blockscout branding.
 *
 * Usage:
 *   PROD_BASE_URL=https://explorer.seth.app node tools/qa/prod-ui-branding-scan.mjs
 */

const baseUrl = (process.env.PROD_BASE_URL || 'https://explorer.seth.app').replace(/\/$/, '');

const routes = [
  '/',
  '/blocks',
  '/txs',
  '/stats',
  '/api-docs',
  '/tokens',
];

const blockedMarkers = [
  'Blockscout chart',
  '(Blockscout chart).png',
  'Open-source block explorer by Blockscout',
  'Blockscout transaction',
  'Blockscout team member',
  'Earn Merits for using Blockscout',
  'duck@blockscout.com',
];

const blockedPatterns = [
  /position:"absolute",opacity:\.1,top:"50%",left:"50%",transform:"translate\(-50%, -50%\)",pointerEvents:"none",viewBox:"0 0 \d+ \d+"/,
];

function extractChunkPaths(html) {
  const chunks = [];
  const regex = /<script[^>]+src="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('/_next/static/chunks/')) {
      chunks.push(src);
    }
  }
  return [ ...new Set(chunks) ];
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { ok: res.ok, status: res.status, text: await res.text() };
}

async function scanText(label, text) {
  const issues = [];
  for (const marker of blockedMarkers) {
    if (text.includes(marker)) {
      issues.push(`marker="${ marker }"`);
    }
  }
  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      issues.push(`pattern=${ pattern }`);
    }
  }
  if (issues.length > 0) {
    console.error(`[FAIL] ${ label } -> ${ issues.join(', ') }`);
    return false;
  }
  return true;
}

async function main() {
  let allPass = true;
  const scannedChunks = new Set();

  for (const route of routes) {
    const pageUrl = `${ baseUrl }${ route }`;
    const page = await fetchText(pageUrl);
    if (!page.ok) {
      allPass = false;
      console.error(`[FAIL] route ${ route } status=${ page.status }`);
      continue;
    }

    if (!(await scanText(`route ${ route }`, page.text))) {
      allPass = false;
    }

    const chunks = extractChunkPaths(page.text);
    for (const chunkPath of chunks) {
      if (scannedChunks.has(chunkPath)) {
        continue;
      }
      scannedChunks.add(chunkPath);
      const chunk = await fetchText(`${ baseUrl }${ chunkPath }`);
      if (!chunk.ok) {
        allPass = false;
        console.error(`[FAIL] chunk ${ chunkPath } status=${ chunk.status }`);
        continue;
      }
      if (!(await scanText(`chunk ${ chunkPath }`, chunk.text))) {
        allPass = false;
      }
    }
  }

  if (!allPass) {
    console.error('[RESULT] FAIL');
    process.exit(1);
  }
  console.log('[RESULT] PASS');
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});
