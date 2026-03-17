# Seth Explorer 分片/交易池可见性就绪报告（2026-03-04）

## 1. 目标
- 回答技术总监问题：浏览器是否可查看“所有分片 + 所有交易池”的区块与交易详情。
- 在生产域 `https://explorer.seth.app` 建立可重复执行的门禁与证据。

## 2. 本轮新增能力
- 新增脚本：`tools/qa/prod-pool-coverage.mjs`
  - 自动读取 `/api/v2/stats.seth_shards[]`。
  - 对每个 `indexed=true` 的池验证：
    - `GET /api/v2/blocks/:height?pool_index=...` 可访问。
    - `GET /api/v2/blocks/:height/transactions?pool_index=...` 可访问。
    - 若存在交易，再验证 `GET /api/v2/transactions/:hash` 可访问。
  - 产物归档：`qa-artifacts/prod-checks/pool-coverage-*.json`。
- 新增命令：`qa:prod:pool-coverage`。
- 将门禁并入：`qa:prod:full`（新增 pool coverage 检查）。

## 3. 生产最新结果（2026-03-04）
- 文件：`qa-artifacts/prod-checks/pool-coverage-2026-03-04T08-45-27-723Z.json`
- 摘要：
  - `shards=2`
  - `totalPools=64`
  - `indexedPools=14`
  - `verifiedBlockDetails=14`
  - `sampledTxDetails=10`
  - `sampledTxPoolsWithoutTxs=4`
  - warning：`root indexed_pools=0`

结论（当前时刻）：
- `shard3`：已索引池可查看区块详情，且可抽样查看交易详情。
- `root`：当前不可用（`indexed_pools=0`），不满足“所有分片所有池均可见”的最终目标。

## 4. 与技术总监问题对齐结论
- 对“现在是否能查看所有分片所有交易池”：
  - **严格意义：否**（root 分片仍 unavailable）。
  - **当前可用范围：是**（shard3 已索引池可查区块/交易详情）。

## 5. 下一阶段（后端优先）必做项
- 5.1 `root` 分片索引恢复
  - 目标：`/api/v2/stats` 中 root 的 `indexed_pools` 从 `0` 提升到稳定值，并持续增长。
- 5.2 共识字段落库与 API 暴露（按 proto）
  - `qc`：`view/view_block_hash/elect_height/leader_idx/network_id/pool_index`
  - `leader_consen_stat`：`succ_num/fail_num`
- 5.3 统一口径
  - 交易主展示字段保持全局高度；本地池高度作为附加字段。
  - 区块/交易详情接口确保 `pool_index + network_id` 可追踪。

## 6. 验收门禁（建议）
- `yarn qa:prod:api-contract`
- `yarn qa:prod:data-freshness`
- `yarn qa:prod:pool-coverage`
- `yarn qa:prod:site-sweep`
- 连续 3 轮通过后再做最终对外验收。
