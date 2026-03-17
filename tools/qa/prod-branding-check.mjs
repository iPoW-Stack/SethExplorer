#!/usr/bin/env node

/**
 * Verify production bundles/icons do not expose blocked branding residues.
 * Usage:
 *   PROD_BASE_URL=https://explorer.seth.app node tools/qa/prod-branding-check.mjs
 */

const baseUrl = process.env.PROD_BASE_URL || 'https://explorer.seth.app';
const statsUrl = `${ baseUrl.replace(/\/$/, '') }/stats`;

const blockedBundleSnippets = [
  '(Blockscout chart).png',
  'Blockscout chart',
];

const blockedBundlePatterns = [
  /position:"absolute",opacity:\.1,top:"50%",left:"50%",transform:"translate\(-50%, -50%\)",pointerEvents:"none",viewBox:"0 0 \d+ \d+"/,
];

const requiredHeadSnippets = [
  '/favicon-seth.svg',
  '/favicon-seth.ico',
  '/apple-touch-icon-seth.png',
];

const requiredIconPaths = [
  '/favicon-seth.ico',
  '/favicon-seth-16x16.png',
  '/favicon-seth-32x32.png',
  '/apple-touch-icon-seth.png',
];

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function fetchStatus(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return { ok: res.ok, status: res.status };
}

function extractChunkPaths(html) {
  const paths = [];
  const regex = /<script[^>]+src="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (src.startsWith('/_next/static/chunks/')) {
      paths.push(src);
    }
  }
  return paths;
}

async function main() {
  let hasFailure = false;

  const page = await fetchText(statsUrl);
  if (!page.ok) {
    console.error(`[FAIL] ${ statsUrl } status=${ page.status }`);
    process.exit(1);
  }

  for (const snippet of requiredHeadSnippets) {
    if (!page.text.includes(snippet)) {
      hasFailure = true;
      console.error(`[FAIL] missing head icon snippet: ${ snippet }`);
    }
  }

  for (const path of requiredIconPaths) {
    const url = `${ baseUrl.replace(/\/$/, '') }${ path }`;
    const iconRes = await fetchStatus(url);
    if (!iconRes.ok) {
      hasFailure = true;
      console.error(`[FAIL] icon not served: ${ path } status=${ iconRes.status }`);
    } else {
      console.log(`[OK] icon served: ${ path }`);
    }
  }

  const chunks = extractChunkPaths(page.text);
  for (const path of chunks) {
    const url = `${ baseUrl.replace(/\/$/, '') }${ path }`;
    const chunk = await fetchText(url);
    if (!chunk.ok) {
      hasFailure = true;
      console.error(`[FAIL] chunk unavailable: ${ path } status=${ chunk.status }`);
      continue;
    }
    for (const snippet of blockedBundleSnippets) {
      if (chunk.text.includes(snippet)) {
        hasFailure = true;
        console.error(`[FAIL] blocked snippet found in ${ path }: ${ snippet }`);
      }
    }
    for (const pattern of blockedBundlePatterns) {
      if (pattern.test(chunk.text)) {
        hasFailure = true;
        console.error(`[FAIL] blocked watermark pattern found in ${ path }: ${ pattern }`);
      }
    }
  }

  if (hasFailure) {
    console.error('[RESULT] FAIL');
    process.exit(1);
  }

  console.log('[RESULT] PASS');
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exit(1);
});
