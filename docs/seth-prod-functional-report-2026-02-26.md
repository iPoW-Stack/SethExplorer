# Seth Explorer 生产功能联调报告（2026-02-26，最终版）

## 1. 目标
- 生产站点：`https://explorer.seth.app/`
- 本阶段目标：先达成功能与数据正确，再推进 UI 6/6 视觉收敛。
- 验收口径：`qa:prod:api-contract + qa:prod:data-freshness + qa:prod:e2e:loop(3轮)` 连续通过。

## 2. 本轮落地变更

### 2.1 后端代码（服务器：`/home/nickwest2025/explorer`）
- 保持并验证 Seth 结构化输出能力：
  - `apps/ethereum_jsonrpc/lib/ethereum_jsonrpc/seth/client.ex`
  - `apps/ethereum_jsonrpc/lib/ethereum_jsonrpc/seth/variant.ex`
  - `apps/block_scout_web/lib/block_scout_web/views/api/v2/block_view.ex`
  - `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/stats_controller.ex`
- 新增修复：
  - `apps/block_scout_web/lib/block_scout_web/controllers/api/v2/main_page_controller.ex`
  - 首页块列表改为非缓存路径（通过 `PagingOptions.key` 强制走实时查询），解决 `/api/v2/main-page/blocks` 与 `/api/v2/blocks` 顶高偶发不一致问题。

### 2.2 后端运行参数（PM2 最终生效）
- Seth RPC 参数：
  - `SETH_SHARDS=root:1,shard3:3`
  - `SETH_POOL_COUNT=32`
  - `SETH_POOL_COUNT_PER_SHARD=32`
  - `SETH_RPC_URL=http://35.197.170.240:23001`
  - `ETHEREUM_JSONRPC_HTTP_URL=http://35.197.170.240:23001`
  - `SETH_RPC_TIMEOUT_MS=6000`
  - `SETH_LATEST_POOL_INFO_TIMEOUT_MS=30000`
  - `SETH_LATEST_POOL_INFO_RETRIES=1`
  - `SETH_POOL_INFO_CACHE_TTL_MS=120000`
  - `SETH_POOL_INFO_REFRESH_INTERVAL_MS=10000`
- Catchup 限流参数（降低超时风暴）：
  - `INDEXER_CATCHUP_BLOCKS_BATCH_SIZE=5`
  - `INDEXER_CATCHUP_BLOCKS_CONCURRENCY=2`
  - `INDEXER_CATCHUP_MISSING_RANGES_BATCH_SIZE=2000`
  - `INDEXER_CATCHUP_BLOCK_INTERVAL=1s`

### 2.3 前端与测试侧（仓库：`d:\Dapp\explorer-fe`）
- 已落地并使用生产门禁脚本：
  - `tools/qa/prod-api-contract.mjs`
  - `tools/qa/prod-data-freshness.mjs`
  - `tools/qa/prod-e2e-loop.mjs`
- `package.json` 已提供：
  - `qa:prod:api-contract`
  - `qa:prod:data-freshness`
  - `qa:prod:e2e:loop`
  - `qa:prod:full`

## 3. 最终验证结果（UTC）

### 3.1 生产全门禁
- `yarn qa:prod:full`：PASS
  - 产物：
    - `qa-artifacts/prod-checks/api-contract-2026-02-26T21-33-57-609Z.json`
    - `qa-artifacts/prod-checks/freshness-2026-02-26T21-33-58-808Z.json`
    - `qa-artifacts/prod-e2e-loop/2026-02-26T21-33-59-655Z/summary.json`
- 追加复核：
  - `yarn qa:prod:data-freshness`：PASS
  - 产物：`qa-artifacts/prod-checks/freshness-2026-02-26T21-49-19-142Z.json`

### 3.2 功能回归
- `yarn test:e2e:full:live`：PASS（匿名主链路、公开页、错误态、权限边界、desktop/mobile UI sanity 全通过）
- `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`：PASS（连续 3 轮全绿）

### 3.3 数据合同与新鲜度
- `/api/v2/stats`：
  - `seth_shards` 为 `root + shard3`
  - 每分片 `pool_count=32` 且 `pools.length=32`
- `/api/v2/blocks`：
  - 返回 `pool_index/shard/shard_index/local_pool_index`
- 新鲜度门禁当前可通过（阈值 `lag<=300s`）。

## 4. 未关闭项（后端/链侧）
- `root` 分片仍为：
  - `indexed_pools=0`
  - `latest_height=null`
- 该项已纳入临时放行，不阻塞当前生产可用性；需继续由链侧/RPC 提供方排查 `network=1` 数据源有效性。

## 5. 结论
- 本阶段“功能与数据优先”目标已达成：生产站点可用、交互闭环完整、自动化门禁通过。
- 当前可进入下一阶段：在稳定基线上推进 Seth Strict 视觉 6/6 收敛（`Home -> Blocks -> Txs -> Block -> Tx -> Address`）。
