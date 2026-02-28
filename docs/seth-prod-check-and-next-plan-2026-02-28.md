# Seth Explorer 生产联调复检报告（2026-02-28）

## 1. 本轮目标与结论
- 目标：确认 `https://explorer.seth.app` 功能完整、数据正确、前端无运行时错误。
- 结论：本轮已达到“可交付”状态。
  - 生产功能门禁连续 3 轮通过。
  - 生产数据合同与新鲜度检查通过。
  - 用户反馈的“高度应为 3 万+”已恢复到 `3217x~3218x` 区间并持续更新。

## 2. 本轮执行与证据

### 2.1 本地/前端基础门禁
- `yarn lint:tsc`：PASS
- `yarn test:vitest --run`：PASS（`33 files / 229 tests`）
- `npx playwright test -c playwright-ct.config.ts ui/sethStrict/StrictPages.pw.tsx`：PASS（3/3）

### 2.2 生产门禁（最新）
- `yarn qa:prod:full`：PASS
  - API 合同：`qa-artifacts/prod-checks/api-contract-2026-02-27T21-38-20-624Z.json`
  - 数据新鲜度：`qa-artifacts/prod-checks/freshness-2026-02-27T21-38-22-982Z.json`
  - E2E 3 轮：`qa-artifacts/prod-e2e-loop/2026-02-27T21-38-27-211Z/summary.json`

## 3. 后端根因修复（本轮新增）

### 3.1 缺陷现象
- `blockscout-backend` 日志中出现异常 catchup 区间（如 `49717 -> 32176`），导致长时间无效抓取。
- 数据库存在反向缺失区间：`missing_block_ranges.from_number > to_number`。

### 3.2 修复动作
1. 修复范围生成逻辑（生产后端源码）
- 文件：`/home/nickwest2025/explorer/apps/indexer/lib/indexer/block/catchup/missing_ranges_collector.ex`
- 变更：
  - `Chain.missing_block_number_ranges(from..to)`
  - 改为 `Chain.missing_block_number_ranges(to..from)`（两处）
- 目的：避免写入反向区间，阻断无效 catchup 循环。

2. 清理坏数据（生产 DB）
- 执行：`delete from missing_block_ranges where from_number > to_number;`
- 结果：删除 `197` 条无效区间，`invalid_after=0`。

3. 重启后端进程
- PM2：`blockscout-backend` 执行 `restart --update-env`。

### 3.3 修复后观测
- catchup 从异常高位区间恢复为正常低位补齐后回归实时。
- API 与页面高度恢复一致：`main-page/blocks`、`stats.shard3.latest_height` 同步在 `3217x~3218x`。

## 4. 数据正确性复检结果
- `/api/v2/stats`：`seth_shards` 已体现 `root + shard3`，且每分片 `pool_count=32`、`pools.length=32`。
- `root indexed_pools=0` 仍存在（既定暂放行项）。
- `shard3` 高度与首页区块列表顶部高度一致。
- 链头时间滞后满足门禁阈值（`<=300s`）。

## 5. 仍需持续跟踪项（非阻塞）
1. `blocks.max(number)` 仍高于 `max(consensus=true)`（历史噪音非共识记录，当前不影响前台显示）。
2. 后端日志仍有 `coin_balance_catchup :empty_response` 噪音，未影响本轮匿名核心功能。
3. `root indexed_pools=0` 继续作为后端侧已知阻塞监控。

## 6. 下一阶段计划（功能稳定后）
1. 先保持当前生产门禁日常巡检：
- `yarn qa:prod:api-contract`
- `yarn qa:prod:data-freshness`
- `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`
2. 针对历史高位非共识块，安排一次离线清理窗口（降低后端噪音风险）。
3. 在功能稳定基线上切回 UI 严格收敛（Home -> Blocks -> Txs -> Block -> Tx -> Address）。
