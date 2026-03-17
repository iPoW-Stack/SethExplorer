#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outputPath = path.join(rootDir, 'test-results', 'qa', 'ui-recommendations-audit.json');

const phaseOneTasks = [
  {
    id: 'UI-P1-001',
    route: '/verified-contracts',
    change: 'Verified Contracts 空态与 counters 口径一致',
    done_definition: 'counters>0 且列表为空时展示 indexing 状态，而不是 no data',
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
    change: '统一品牌化空状态组件',
    done_definition: '目标页面使用 ExplorerEmptyState，并提供描述与 CTA',
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
    change: 'Block 详情 Prev/Next 导航',
    done_definition: '区块详情页存在可点击 Prev/Next（含 disable 边界）',
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
    change: '交易列表状态图标 + Method 颜色编码 + copy 反馈入口',
    done_definition: 'strict 交易列表渲染状态图标/Method tone/copy 交互',
    owner: 'frontend',
    evidence_path: 'ui/sethStrict/StrictTransactionsPage.tsx',
    check: () => all([
      fileContains('ui/sethStrict/StrictTransactionsPage.tsx', [ 'getMethodToneStyle', 'getStatusBadge', 'CopyToClipboard' ]),
      fileContains('ui/sethStrict/adapters/useStrictTransactionsData.ts', [ 'status', 'methodTone' ]),
    ]),
  },
  {
    id: 'UI-P1-005',
    route: '全站表格',
    change: '统一表格 hover/斑马纹/点击反馈',
    done_definition: 'seth 样式下 key 列表具备 hover 与斑马纹',
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
    route: 'Header 索引状态条',
    change: '索引状态条改进为进度条并支持非首页折叠',
    done_definition: '显示百分比 progress；非首页可 collapse/expand',
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
    change: '分片状态业务文案化 + 技术码折叠',
    done_definition: '主状态显示 Healthy/Degraded/Unavailable，技术码在 Details 中',
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
    change: 'API Docs 品牌清理',
    done_definition: '前端渲染层过滤 Blockscout 字样',
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
    change: '统计卡片可读性提升',
    done_definition: 'icon 对比度提升、value 层级增强',
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
      change: '可见文案不出现 Blockscout',
      done_definition: 'api-docs 可见文本无 Blockscout',
      owner: 'frontend',
      evidence_path: `${ normalizedBase }/api-docs`,
      check: async() => {
        const res = await fetch(`${ normalizedBase }/api-docs`);
        if (!res.ok) {
          return false;
        }
        const html = await res.text();
        const visible = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ');
        return !/blockscout/i.test(visible);
      },
    },
    {
      id: 'UI-PROD-002',
      route: '/api/v2/stats',
      change: 'Stats 数据包含分片状态字段',
      done_definition: 'stats API 返回 seth_shards 数组用于 UI 状态展示',
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
