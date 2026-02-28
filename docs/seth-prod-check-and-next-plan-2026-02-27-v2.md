# Seth Explorer 生产复检与下一阶段计划（2026-02-27）

## 1. 本次复检范围
- 站点：`https://explorer.seth.app`
- 本地门禁：`yarn qa:functional:full`
- 生产门禁：
  - `yarn qa:prod:api-contract`
  - `yarn qa:prod:data-freshness`
  - `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`
- 线上运行态核查（SSH 到 `34.16.27.175`）：
  - PM2 进程
  - 后端日志
  - 前端运行配置 `public/assets/envs.js`
  - PostgreSQL 块数据新鲜度

## 2. 结果总览（2026-02-27）

### 2.1 通过项
- 本地功能全量门禁通过：`yarn qa:functional:full`
  - `tsc`、`vitest (229)`、strict CT、full e2e、HAR 全绿。
- 生产 API 合同通过：`qa-artifacts/prod-checks/api-contract-2026-02-27T11-15-27-019Z.json`
- 生产 e2e 连续 3 轮通过：`qa-artifacts/prod-e2e-loop/2026-02-27T11-29-07-137Z/summary.json`

### 2.2 未通过项（P0）
- 生产数据新鲜度失败：`qa-artifacts/prod-checks/freshness-2026-02-27T11-45-19-759Z.json`
  - 错误：`head timestamp lag too large: 34901s > 300s`
  - 当前主高度：`4042`
  - 首块时间：`2026-02-27T02:03:39Z`（明显滞后）

## 3. 关键发现（按归因）

### 3.1 Backend / Infra（P0 阻塞）
- 后端日志持续出现 Seth RPC 失败：
  - `get_latest_pool_info ... :econnrefused`
  - `all_shards_failed ... falling back to single pool`
- 线上后端环境（PM2 env）：
  - `SETH_RPC_URL=http://35.197.170.240:23001`
  - `ETHEREUM_JSONRPC_HTTP_URL=http://35.197.170.240:23001`
  - `SETH_SHARDS=root:1,shard3:3`
- 现状判定：
  - explorer 的交互路径可用，但链上数据未达到“新鲜且正确”的交付标准。
  - 核心阻塞是后端对 Seth RPC 的可用性与返回口径不稳定。

### 3.2 Frontend 配置问题（P1）
- 已执行热修（2026-02-27）：
  - `NEXT_PUBLIC_STATS_API_HOST` 从 `http://localhost:8080` 改为 `https://explorer.seth.app`
  - `NEXT_PUBLIC_VISUALIZE_API_HOST` 从 `http://localhost:8081` 改为 `https://explorer.seth.app`
- 修复效果：
  - 已消除浏览器首方 `localhost` 的 `ERR_CONNECTION_REFUSED`。
- 当前剩余问题：
  - `/stats` 与 `/api-docs` 相关接口仍会出现 `400`（服务口径不匹配），需后续按“接入真实 stats/visualize 服务或显式降级”处理。

### 3.3 数据库观测（辅助证据）
- DB `blocks` 表存在非共识数据持续写入，但 `consensus=true` 的有效链头未持续推进：
  - `max(consensus=true inserted_at) = 2026-02-27 07:00:54`
  - `max(consensus=true timestamp) = 2026-02-27 06:58:33`
- 与 `api/v2/main-page/blocks` 首条时间 `2026-02-27T02:03:39Z` 一致反映“链头展示滞后”问题。

## 4. 下一阶段修复计划（功能与数据优先）

### 阶段 A：先清 P0（后端数据链路）
1. 修复/替换 Seth RPC（必须可从生产机稳定访问）。
2. 以 30 分钟窗口观察 backend 日志：
   - 不再出现 `get_latest_pool_info` 的 `econnrefused/timeout` 高频错误。
3. 验证链头推进：
   - `main-page/blocks`、`blocks`、`stats.shard3.latest_height` 持续增长。
4. 重新执行：
   - `yarn qa:prod:data-freshness`
   - 目标：`lagSeconds <= 300`。

### 阶段 B：修复前端生产配置（并行 P1）
1. （已完成）去掉浏览器不可达 `localhost:8080/8081`。
2. 若暂无可用 stats/visualize 服务：
   - 暂时下线对应入口或改为明确“服务不可用”终态（不允许隐式报错）。
3. 回归验证 `/stats`、`/api-docs`：
   - 无浏览器首方 `ERR_CONNECTION_REFUSED`（当前已满足）。
   - 无持续 `400` 噪音（当前未满足）。

### 阶段 C：稳定门禁复验
1. `yarn qa:prod:api-contract`
2. `yarn qa:prod:data-freshness`
3. `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`
4. 判定：三项全部 PASS 才可宣告“功能+数据可交付”。

## 5. 当前阻塞与需要提供的信息
- 目前唯一实质阻塞：**可稳定访问且返回正确分片数据的 Seth RPC 接入信息**。
- 需要提供：
  - 可用 RPC 地址（host/port/protocol/path）
  - 是否需要鉴权（token/header）
  - root/shard3 的网络参数映射（例如 `root:?`, `shard3:?`）
- 原因：
  - 不拿到正确 RPC，后端无法恢复链头同步，`qa:prod:data-freshness` 将持续失败。
