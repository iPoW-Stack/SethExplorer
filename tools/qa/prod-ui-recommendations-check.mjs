#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outputPath = path.join(rootDir, 'test-results', 'qa', 'ui-recommendations-audit.json');

const phaseOneTasks = [
  {
    id: 'UI-P1-001',
    route: '/verified-contracts',
    change: 'Align the Verified Contracts empty state with the counter totals',
    done_definition: 'Show an indexing state instead of a no-data state when counters are positive but the list is empty',
    owner: 'frontend',
    evidence_path: 'ui/pages/VerifiedContracts.tsx',
    check: () => fileContains('ui/pages/VerifiedContracts.tsx', [
      'shouldShowIndexingState',
      'verified-contracts-indexing-state',
      'Verified contracts are still syncing',
    ]),
  },
  {
    id: 'UI-P1-002',
    route: '/tokens,/accounts,/internal-txs,/token-transfers,/search-results',
    change: 'Standardize branded empty-state components across key routes',
    done_definition: 'Target pages use ExplorerEmptyState and provide descriptive copy plus a CTA',
    owner: 'frontend',
    evidence_path: 'ui/shared/emptyState/ExplorerEmptyState.tsx',
    check: () => all([
      fileContains('ui/shared/emptyState/ExplorerEmptyState.tsx', [ 'ExplorerEmptyState' ]),
      fileContains('ui/tokens/Tokens.tsx', [ 'ExplorerEmptyState', 'tokens-empty-state' ]),
      fileContains('ui/pages/Accounts.tsx', [ 'ExplorerEmptyState', 'accounts-empty-state' ]),
      fileContains('ui/pages/InternalTxs.tsx', [ 'ExplorerEmptyState', 'internal-txs-empty-state' ]),
      fileContains('ui/pages/TokenTransfers.tsx', [ 'ExplorerEmptyState', 'token-transfers-empty-state' ]),
      fileContains('ui/pages/SearchResults.tsx', [ 'ExplorerEmptyState', 'search-results-empty-state' ]),
    ]),
  },
  {
    id: 'UI-P1-003',
    route: '/block/[height_or_hash]',
    change: 'Add Prev/Next navigation on block detail pages',
    done_definition: 'Block detail pages render clickable Prev/Next controls with proper disabled boundaries',
    owner: 'frontend',
    evidence_path: 'ui/sethStrict/StrictBlockDetailPage.tsx',
    check: () => fileContains('ui/sethStrict/StrictBlockDetailPage.tsx', [
      'strict-block-prev-link',
      'strict-block-next-link',
      'Prev',
      'Next',
    ]),
  },
  {
    id: 'UI-P1-004',
    route: '/txs',
    change: 'Add tx status icons, method color coding, and copy feedback',
    done_definition: 'The strict transaction list renders status icons, method tone styling, and copy interactions',
    owner: 'frontend',
    evidence_path: 'ui/sethStrict/StrictTransactionsPage.tsx',
    check: () => all([
      fileContains('ui/sethStrict/StrictTransactionsPage.tsx', [ 'getMethodToneStyle', 'getStatusBadge', 'CopyToClipboard' ]),
      fileContains('ui/sethStrict/adapters/useStrictTransactionsData.ts', [ 'status', 'methodTone' ]),
    ]),
  },
  {
    id: 'UI-P1-005',
    route: 'sitewide tables',
    change: 'Standardize table hover, striping, and click feedback',
    done_definition: 'Key lists in the Seth theme have hover feedback and zebra striping',
    owner: 'frontend',
    evidence_path: 'toolkit/theme/globalCss.ts',
    check: () => all([
      fileContains('toolkit/theme/globalCss.ts', [
        'table tbody tr:nth-of-type(odd)',
        'table tbody tr:hover td',
      ]),
      fileContains('ui/sethStrict/StrictBlocksPage.tsx', [ 'boxShadow: \'inset 3px 0 0 #00FFA3\'' ]),
      fileContains('ui/sethStrict/StrictTransactionsPage.tsx', [ 'boxShadow: \'inset 3px 0 0 #00FFA3\'' ]),
    ]),
  },
  {
    id: 'UI-P1-006',
    route: 'header indexing status bar',
    change: 'Convert the indexing notice into a progress bar with non-home collapse support',
    done_definition: 'The UI shows percentage progress and allows collapse/expand away from the home page',
    owner: 'frontend',
    evidence_path: 'ui/snippets/header/alerts/IndexingBlocksAlert.tsx',
    check: () => fileContains('ui/snippets/header/alerts/IndexingBlocksAlert.tsx', [
      'Progress',
      'Collapse',
      'Show details',
      'COLLAPSE_STORAGE_KEY',
    ]),
  },
  {
    id: 'UI-P1-007',
    route: '/stats',
    change: 'Use business-friendly shard status copy with expandable technical details',
    done_definition: 'Primary shard states are Healthy/Degraded/Unavailable, with technical codes moved into a Details section',
    owner: 'frontend',
    evidence_path: 'ui/stats/SethShardsStatus.tsx',
    check: () => all([
      fileContains('ui/stats/SethShardsStatus.tsx', [ 'IndexerStatusBadge', 'Details', 'source_state' ]),
      fileContains('ui/shared/status/IndexerStatusBadge.tsx', [ 'Healthy', 'Degraded', 'Unavailable' ]),
    ]),
  },
  {
    id: 'UI-P1-008',
    route: '/api-docs',
    change: 'Remove legacy Blockscout branding in API Docs',
    done_definition: 'The frontend render layer filters visible Blockscout branding',
    owner: 'frontend',
    evidence_path: 'ui/apiDocs/SwaggerUI.tsx',
    check: () => fileContains('ui/apiDocs/SwaggerUI.tsx', [
      'replaceBrandingText',
      'responseInterceptor',
      'Seth Explorer',
    ]),
  },
  {
    id: 'UI-P1-009',
    route: '/stats',
    change: 'Improve stats card readability',
    done_definition: 'Icons have better contrast and values use a stronger visual hierarchy',
    owner: 'frontend',
    evidence_path: 'ui/shared/stats/StatsWidget.tsx',
    check: () => fileContains('ui/shared/stats/StatsWidget.tsx', [
      'rgba(0, 255, 148, 0.14)',
      'fontWeight={ 700 }',
    ]),
  },
];

function all(results) {
  return results.every(Boolean);
}

function fileContains(relativePath, snippets) {
  const absPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absPath)) {
    return false;
  }

  const source = fs.readFileSync(absPath, 'utf8');
  return snippets.every((snippet) => source.includes(snippet));
}

async function checkProductionSignals(baseUrl) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const checks = [
    {
      id: 'UI-PROD-001',
      route: '/api-docs',
      change: 'Ensure visible API Docs copy does not contain Blockscout branding',
      done_definition: 'Visible text in API Docs should not contain the word Blockscout',
      owner: 'frontend',
      evidence_path: `${ normalizedBase }/api-docs`,
      check: async() => {
        const res = await fetch(`${ normalizedBase }/api-docs`);
        if (!res.ok) {
          return false;
        }

        const html = await res.text();
        const visible = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ');

        return !/blockscout/i.test(visible);
      },
    },
    {
      id: 'UI-PROD-002',
      route: '/api/v2/stats',
      change: 'Ensure stats payloads include shard status data',
      done_definition: 'The stats API returns a seth_shards array for UI shard status rendering',
      owner: 'frontend',
      evidence_path: `${ normalizedBase }/api/v2/stats`,
      check: async() => {
        const res = await fetch(`${ normalizedBase }/api/v2/stats`);
        if (!res.ok) {
          return false;
        }

        const payload = await res.json().catch(() => null);
        return Array.isArray(payload?.seth_shards);
      },
    },
  ];

  const results = [];

  for (const item of checks) {
    let status = 'pending';
    let reason;

    try {
      status = (await item.check()) ? 'done' : 'pending';
      if (status !== 'done') {
        reason = 'production check failed';
      }
    } catch (error) {
      status = 'pending';
      reason = error instanceof Error ? error.message : String(error);
    }

    results.push({
      ...item,
      status,
      reason,
    });
  }

  return results;
}

async function main() {
  const baseUrl = process.env.PROD_BASE_URL || 'https://explorer.seth.app';
  const localResults = phaseOneTasks.map((task) => {
    const status = task.check() ? 'done' : 'pending';

    return {
      id: task.id,
      route: task.route,
      change: task.change,
      done_definition: task.done_definition,
      owner: task.owner,
      evidence_path: task.evidence_path,
      status,
    };
  });

  const prodResults = await checkProductionSignals(baseUrl);
  const entries = [ ...localResults, ...prodResults ];

  const summary = entries.reduce((acc, item) => {
    if (item.status === 'done') {
      acc.done += 1;
    } else {
      acc.pending += 1;
    }

    return acc;
  }, { total: entries.length, done: 0, pending: 0 });

  const payload = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    summary,
    entries,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${ JSON.stringify(payload, null, 2) }\n`, 'utf8');

  console.log(`[ui-recommendations] output=${ outputPath }`);
  console.log(`[ui-recommendations] total=${ summary.total } done=${ summary.done } pending=${ summary.pending }`);

  if (summary.pending > 0) {
    console.error('[ui-recommendations] FAIL');
    process.exit(1);
  }

  console.log('[ui-recommendations] PASS');
}

main().catch((error) => {
  console.error('[ui-recommendations] ERROR', error);
  process.exit(1);
});
