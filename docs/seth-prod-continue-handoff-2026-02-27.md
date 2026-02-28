# Seth Explorer 续跑现场记录（2026-02-27）

## 1. 当前状态（可直接续跑）
- 生产站点：`https://explorer.seth.app/`
- 后端进程：`blockscout-backend` 在线
- 前端进程：`blockscout-frontend` 在线
- 本轮关键门禁：`yarn qa:prod:full` 已 PASS（含 3 轮 e2e）

## 2. 本轮关键结果
- `qa:prod:api-contract`：PASS
  - `qa-artifacts/prod-checks/api-contract-2026-02-26T21-33-57-609Z.json`
- `qa:prod:data-freshness`：PASS
  - `qa-artifacts/prod-checks/freshness-2026-02-26T21-33-58-808Z.json`
  - `qa-artifacts/prod-checks/freshness-2026-02-26T21-49-19-142Z.json`
- `qa:prod:e2e:loop`（3轮）：PASS
  - `qa-artifacts/prod-e2e-loop/2026-02-26T21-33-59-655Z/summary.json`

## 3. 已生效运行参数（backend）
- `SETH_RPC_TIMEOUT_MS=6000`
- `SETH_LATEST_POOL_INFO_TIMEOUT_MS=30000`
- `SETH_LATEST_POOL_INFO_RETRIES=1`
- `SETH_POOL_INFO_CACHE_TTL_MS=120000`
- `SETH_POOL_INFO_REFRESH_INTERVAL_MS=10000`
- `INDEXER_CATCHUP_BLOCKS_BATCH_SIZE=5`
- `INDEXER_CATCHUP_BLOCKS_CONCURRENCY=2`
- `INDEXER_CATCHUP_MISSING_RANGES_BATCH_SIZE=2000`
- `INDEXER_CATCHUP_BLOCK_INTERVAL=1s`

## 4. 未关闭项
- `root` 分片仍 `indexed_pools=0`、`latest_height=null`。
- 该项当前已放行并保留证据，归因后端/链侧数据源。

## 5. 下一阶段建议
1. 保持现有参数继续跑 24h 监控，确认新鲜度长期稳定。
2. 与链侧排查 `network=1` 根因，决定 root 分片产品口径。
3. 在功能稳定基线上切换 UI 严格收敛（`Home -> Blocks -> Txs -> Block -> Tx -> Address`），冲刺设计 6/6。
4. UI 续跑细节与最新审计基线见：`docs/seth-strict-ui-continue-handoff-2026-02-27.md`。

## 6. 续跑命令
```bash
yarn qa:prod:api-contract
yarn qa:prod:data-freshness
PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop
```
