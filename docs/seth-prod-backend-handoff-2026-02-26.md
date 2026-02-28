# Seth Explorer 后端对接与阻塞清单（2026-02-26，最终版）

## 1. 线上环境
- 服务器：`34.16.27.175`
- 后端目录：`/home/nickwest2025/explorer`
- 前端目录：`/home/nickwest2025/explorer-fe`
- PM2 进程：
  - `blockscout-backend`（id=0）
  - `blockscout-frontend`（id=1）

## 2. 已完成并生效的后端项

### 2.1 分片结构与字段
- `SETH_SHARDS=root:1,shard3:3`
- `SETH_POOL_COUNT_PER_SHARD=32`
- `SETH_POOL_COUNT=32`
- `/api/v2/stats`：`seth_shards` 为 `root + shard3`，每分片 `pool_count=32`、`pools.length=32`。
- `/api/v2/blocks`：返回 `pool_index/shard/shard_index/local_pool_index`。

### 2.2 首页区块数据一致性修复
- 文件：`apps/block_scout_web/lib/block_scout_web/controllers/api/v2/main_page_controller.ex`
- 动作：首页 blocks 查询改为非缓存路径（`PagingOptions.key` 强制实时拉取）。
- 结果：`/api/v2/main-page/blocks` 与 `/api/v2/blocks` 顶高差异从偶发 `20+` 收敛到门禁阈值内（`<=2`）。

### 2.3 运行参数（当前建议保留）
- Seth RPC：
  - `SETH_RPC_TIMEOUT_MS=6000`
  - `SETH_LATEST_POOL_INFO_TIMEOUT_MS=30000`
  - `SETH_LATEST_POOL_INFO_RETRIES=1`
  - `SETH_POOL_INFO_CACHE_TTL_MS=120000`
  - `SETH_POOL_INFO_REFRESH_INTERVAL_MS=10000`
- Catchup：
  - `INDEXER_CATCHUP_BLOCKS_BATCH_SIZE=5`
  - `INDEXER_CATCHUP_BLOCKS_CONCURRENCY=2`
  - `INDEXER_CATCHUP_MISSING_RANGES_BATCH_SIZE=2000`
  - `INDEXER_CATCHUP_BLOCK_INTERVAL=1s`
- 目的：降低 `post_get_blocks` 超时风暴，避免 catchup 抢占导致链头滞后。

## 3. 验证证据
- `yarn qa:prod:api-contract`：PASS
  - `qa-artifacts/prod-checks/api-contract-2026-02-26T21-33-57-609Z.json`
- `yarn qa:prod:data-freshness`：PASS
  - `qa-artifacts/prod-checks/freshness-2026-02-26T21-33-58-808Z.json`
  - `qa-artifacts/prod-checks/freshness-2026-02-26T21-49-19-142Z.json`
- `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`：PASS
  - `qa-artifacts/prod-e2e-loop/2026-02-26T21-33-59-655Z/summary.json`

## 4. 当前阻塞与归因
- 阻塞项：`root` 分片仍 `indexed_pools=0`、`latest_height=null`。
- 归因：后端/链侧数据源问题（`network=1`），非前端渲染逻辑问题。
- 当前策略：临时放行 root 数据缺失，但保留监控和告警。

## 5. 后端后续动作（必须）
1. 对 `network=1` 的 `get_latest_pool_info/get_blocks` 建立稳定性监控（成功率、P95/P99、timeout 比例）。
2. 在 stats 输出增加分片可用性状态（建议字段：`source_state=ok|timeout|unavailable`）。
3. 若 root 长期无数据，后端需明确产品口径（显示为空 vs 隐藏 vs 降级说明）。
4. 固化当前 PM2 参数到正式启动脚本，避免重启后丢失。

## 6. 运维命令（线上）
```bash
# 查看进程
sudo -u nickwest2025 env PATH=/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:$PATH pm2 ls

# 查看 backend 环境
sudo -u nickwest2025 env PATH=/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:$PATH pm2 env 0 | grep -E 'SETH_|INDEXER_CATCHUP'

# 快速验证
yarn qa:prod:api-contract
yarn qa:prod:data-freshness
PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop
```
