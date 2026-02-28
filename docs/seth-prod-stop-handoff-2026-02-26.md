# Seth Explorer 停机现场记录（2026-02-26）

## 停止时间
- 本地时间：2026-02-26T21:59:24+08:00
- 已按要求停止继续修复，仅做现场保存。

## 当前总状态
- 生产站点：`https://explorer.seth.app/`
- 服务器：`34.16.27.175`
- PM2 进程在线：`blockscout-backend`、`blockscout-frontend`
- 当前重点：
  - 已把 Seth 分片结构扩展到接口里（root + shard3，且每分片 32 pools 列表可见）
  - 后端仍有数据源不稳定问题（RPC 间歇超时，部分页面前端加载失败）

## 已完成（本轮）
1. 后端 `stats` 接口增强：增加 `seth_shards[].pools` 结构，返回每个分片 32 个池的明细（`local_pool_index/global_pool_index/indexed/latest_height/latest_block_timestamp`）。
2. 后端仍保留并返回区块维度分片字段：`pool_index/shard/shard_index/local_pool_index`。
3. 更新了后端运行环境超时参数（通过 PM2 `--update-env`）：
   - `SETH_RPC_TIMEOUT_MS=45000`
   - `SETH_LATEST_POOL_INFO_TIMEOUT_MS=45000`
   - `SETH_LATEST_POOL_INFO_RETRIES=1`
4. 产物保存：
   - `qa-artifacts/handoff-20260226-stop/backend-git-status.txt`
   - `qa-artifacts/handoff-20260226-stop/backend-diff-targeted.patch`
   - `qa-artifacts/handoff-20260226-stop/backend-pm2-env.txt`
   - `qa-artifacts/handoff-20260226-stop/prod-api-snapshot.json`

## 当前未解决问题（恢复后优先）
1. 数据正确性：
   - `root` 分片目前接口可见但 `indexed_pools=0`，数据库未见 root 有效入库数据。
   - `shard3` 在跑，但顶高推进有间歇性停滞。
2. 前端功能可用性（生产构建资源问题）：
   - `/search-results`、`/tokens`、`/internal-txs`、`/verified-contracts`、`/accounts` 等页面在浏览器实测出现 JS chunk 加载失败（400，`MIME text/html`），导致页面空白。
   - `/csv-export` 返回 `500`。
3. 全量 e2e 未通过（`test:e2e:full:live` 失败），但 `test:e2e:core:live` 可通过。

## 关键证据
- 失败截图/trace：在 `test-results/public-smoke-full-*` 目录。
- 典型错误：
  - `Refused to execute script ... pages/<route>-<hash>.js because its MIME type ('text/html') is not executable`
  - `/csv-export` 响应 500

## 远端改动文件（后端）
- `/home/nickwest2025/explorer/apps/ethereum_jsonrpc/lib/ethereum_jsonrpc/seth/client.ex`
- `/home/nickwest2025/explorer/apps/ethereum_jsonrpc/lib/ethereum_jsonrpc/seth/variant.ex`
- `/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/views/api/v2/block_view.ex`
- `/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/controllers/api/v2/stats_controller.ex`
- `/home/nickwest2025/explorer/apps/explorer/config/prod/seth.exs`
- `/home/nickwest2025/explorer/apps/indexer/config/prod/seth.exs`

## 恢复后第一批动作（按顺序）
1. 先修生产前端 chunk 404/400 问题（确认 Nginx/Next build 产物版本一致、`_next/static/chunks/pages/*` 可正常返回 JS）。
2. 修复 `/csv-export` 500（先拿接口日志，再定 FE/BE 责任并修复）。
3. 再做后端 root 分片数据入库核查：RPC `network=1` 返回为空对象数组是否为上游真实状态，还是索引策略问题。
4. 重新执行：
   - `yarn test:e2e:core:live`
   - `yarn test:e2e:full:live`
   - 保存新一轮证据并继续修复。

## 备注
- 我已经停止继续改动，便于你关机后下次从该文档直接续接。
