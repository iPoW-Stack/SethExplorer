# Seth Explorer 生产功能联调报告（2026-02-28）

## 1. 目标与范围
- 目标：将 `https://explorer.seth.app` 收敛到“数据正确 + 功能可用 + 运行稳定”。
- 范围：前端（匿名主链路、交互、错误态）、后端（链头同步、分片统计、缺失区间）、chain-shim（上游节点选择、抗漂移）。
- 本轮日期：`2026-02-28`（UTC+0 以服务器日志为准）。

## 2. 本轮关键变更

### 2.1 Backend（生产机器 `34.16.27.175`）
1. 修复缺失区间方向错误（防止反向区间）。
- 文件：`/home/nickwest2025/explorer/apps/indexer/lib/indexer/block/catchup/missing_ranges_collector.ex`
- 变更：两处 `Chain.missing_block_number_ranges(from..to)` 改为 `Chain.missing_block_number_ranges(to..from)`。
- 目的：防止写入 `from_number > to_number` 的坏区间，避免 catchup 无效循环。

2. 扩展 stats 分片状态字段并固定分片合同。
- 文件：`/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/controllers/api/v2/stats_controller.ex`
- 新增输出字段：
  - `source_state: ok|unavailable|timeout|degraded`
  - `last_synced_at`（ISO8601）
  - `error_code`（可空）
- 合同增强：`seth_shards` 固定包含 `root`、`shard3`，每分片 `pool_count=32` 且 `pools.length=32`。

3. 数据库清理。
- 删除反向缺失区间：
  - `delete from missing_block_ranges where from_number > to_number;`
- 删除历史高位非共识噪音块（超过 `max(consensus=true)` 的 `consensus=false` 记录）。

### 2.2 Chain-shim（生产机器 `34.82.205.176`）
1. 强化 endpoint 健康评分与熔断。
- 文件：`/opt/seth-chain-shim/chain_shim.py`
- 新增：失败阈值、冷却时间、恢复计数、失败衰减。
- 行为：异常 endpoint 自动降权；全部异常时 fail-open 兜底探测。

2. 启动前配置一致性校验。
- 文件：`/opt/seth-chain-shim/chain_shim.py`
- 启动时比对：
  - `/etc/default/seth-chain-shim`
  - `/tmp/seth-chain-shim.mini8.env`
- 不一致时拒绝启动（默认开启）。

3. 健康监控定时任务（每分钟）。
- 新文件：
  - `/opt/seth-chain-shim/monitor_shim_health.py`
  - `/etc/systemd/system/seth-chain-shim-monitor.service`
  - `/etc/systemd/system/seth-chain-shim-monitor.timer`
- 规则：5 分钟窗口内失败率 > 5% 触发告警日志（syslog logger）。

### 2.3 Frontend（仓库 `d:\Dapp\explorer-fe`）
1. 维持 strict live 功能链路门禁通过。
- `qa:functional:full` 全绿。
- `qa:prod:full` 连续 3 轮全绿。

2. “level 静态伪字段”检查。
- 当前无 `level2` 静态硬编码占位。
- 地址页 XStar 展示依赖返回值，不返回即不显示等级标签。

## 3. 验证结果（最终）

### 3.1 功能与稳定性门禁
1. `yarn qa:functional:full`：PASS。
2. `yarn qa:prod:full`：PASS。
- API 合同：
  - `qa-artifacts/prod-checks/api-contract-2026-02-27T22-50-27-468Z.json`
- 数据新鲜度：
  - `qa-artifacts/prod-checks/freshness-2026-02-27T22-50-29-094Z.json`
- 生产 E2E 三轮：
  - `qa-artifacts/prod-e2e-loop/2026-02-27T22-50-30-647Z/summary.json`

### 3.2 数据口径抽检
- `/api/v2/stats`：
  - `root/shard3` 均存在。
  - `pool_count=32`、`pools.length=32`。
  - `root source_state=unavailable`（indexed_pools=0，按当前策略放行）。
- `/api/v2/main-page/blocks` 顶部高度与 `stats.shard3.latest_height` 对齐。

## 4. 当前状态结论
- 生产功能：可交付。
- 生产数据：核心口径正确，链头持续更新。
- 已知放行项：`root indexed_pools=0`（有显式状态，不再隐式“正常”）。

## 5. 未完成项 / 风险
1. 严格 UI 设计审计仍未达 6/6（本轮重点为功能与数据）。
- 最新审计：`docs/ui-audit-seth-strict.md`
- 当前为 desktop 全页未过 97 分阈值。

2. 后端日志仍有非阻塞噪音。
- `coin_balance_catchup :empty_response`、`empty_blocks_to_refetch` 间歇报错。
- 当前未导致匿名核心链路不可用，但建议后续专项治理。

## 6. 本轮产物索引
- 现场冻结快照：`qa-artifacts/prod-checks/freeze-2026-02-27T22-28-41Z`
- 设计审计报告：`docs/ui-audit-seth-strict.md`
- 运行与门禁证据：`qa-artifacts/prod-checks/*`、`qa-artifacts/prod-e2e-loop/*`
