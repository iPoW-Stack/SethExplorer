# Seth Explorer 生产功能联调报告（2026-03-01）

## 1. 目标与范围
本轮按生产域 `https://explorer.seth.app` 执行：
- 修复交易块高主字段口径（`block_number` 统一为全局高度，`local_block_number` 仅做次级字段）。
- 清理线上可见 Branding 残留（favicon、charts 水印/导出命名）。
- 执行生产门禁与功能回归，确认核心匿名链路可用。

## 2. 已完成变更

### 2.1 后端交易分页口径修复（已发布）
服务器：`34.16.27.175`，进程：`pm2 blockscout-backend`。

已修改并上线：
- `/home/nickwest2025/explorer/apps/explorer/lib/explorer/chain/transaction.ex`
  - `recent_collated_transactions/2` 切换到基于 `blocks.number` 的全局排序与分页。
  - 新增 `apply_recent_collated_transactions_global_paging/*`，不再使用本地池高度做翻页主键。
- `/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/chain.ex`
  - `paging_params(%Transaction{})` 优先使用 preload 的 `block.number` 生成 `next_page_params`。

效果：
- `/api/v2/transactions` 的 `next_page_params.block_number` 已为全局高度。
- 翻页后区块高度保持全局递减，不再出现“第一页全局、第二页回落到本地 4k”的混排。

### 2.2 品牌残留清理（已发布）
已通过：
- `qa:prod:branding`：PASS
- `tools/qa/prod-ui-branding-scan.mjs`：PASS

已确认：
- Seth favicon 生效（`/favicon-seth.ico`、`/favicon-seth-16x16.png`、`/favicon-seth-32x32.png`、`/apple-touch-icon-seth.png`）。
- charts 运行时未检测到 Blockscout 水印文案残留。

## 3. 自动化与回归结果

### 3.1 已通过
- `qa:prod:e2e:loop`（3 轮）PASS  
  归档：`qa-artifacts/prod-e2e-loop/2026-03-01T13-24-27-954Z/summary.json`
- `qa:prod:realtime-health` PASS  
  归档：`qa-artifacts/prod-checks/realtime-health-2026-03-01T13-44-35-395Z.json`
- `qa:prod:api-contract` PASS（最新）  
  归档：`qa-artifacts/prod-checks/api-contract-2026-03-01T14-20-59-666Z.json`
- `E2E_BASE_URL=https://explorer.seth.app yarn test:e2e:core:live`：14/14 PASS
- 交易口径专项抽检 PASS  
  归档：`qa-artifacts/prod-checks/tx-global-height-consistency-2026-03-01T13-57-36-851488Z.json`

### 3.2 当前未通过（阻塞）
- `qa:prod:data-freshness`：FAIL  
  最新归档：`qa-artifacts/prod-checks/freshness-2026-03-01T14-21-42-336Z.json`
- 失败项：
  - `live head timestamp lag too large`
  - `head timestamp lag too large`

## 4. 根因定位（当前阻塞）

### 4.1 生产机到 Seth RPC 节点连通性异常
从生产机 `34.16.27.175` 对技术总监提供的 80 个节点（`23001~23080`）进行连通抽测：
- 当前窗口内可用率接近 0。
- 常见错误：`ECONNREFUSED` / `ConnectTimeout` / `ReadTimeout`。

这会直接导致：
- `get_latest_pool_info` 与 `get_blocks` 无法稳定返回。
- indexer 长时间停在旧高度窗口，`main-page/blocks` 时间戳持续老化。

### 4.2 现象证据
- `/api/v2/seth/live-head` 长时间 `source_state=degraded`，全局头回退到 `indexer`。
- backend 日志持续出现 `fetch_blocks_sharded ... pairs=0` 且 `collected blocks=0`。
- `block_catchup` 在同一批缺口反复循环，无法拉回实时。

## 5. 结论
- **已完成并稳定**：交易口径修复、分页修复、品牌清理、核心功能可用性（3 轮 e2e 全绿）。
- **未闭环的唯一 P0**：生产机到 Seth RPC 集群网络不可用，导致“实时新鲜度”门禁无法持续通过。

## 6. 必须补齐的外部条件（否则无法继续收敛到“完美版”）
1. 提供一个从 `34.16.27.175` 可稳定访问的 Seth RPC 网关（或放通现有 80 节点端口出站）。
2. 明确“全局高度”的官方口径（公式或权威接口），用于彻底收敛 block/tx 显示一致性。

在这两个条件未满足前，前端功能与交互可继续保持可用，但“实时数据严格对齐链网”无法签署最终完成。
