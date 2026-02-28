# Seth Explorer 生产全量检查与下一步修复计划（2026-02-27）

## 1. 本轮检查范围与执行结果

### 1.1 本地全量门禁（前端功能）
- 命令：`yarn qa:functional:full`
- 时间：`2026-02-27`
- 结果：`PASS`
- 关键结论：
  - `lint:tsc` 通过
  - `vitest` 通过（`229 passed`）
  - strict 组件测试通过
  - 全量 e2e（core/public/error/auth/ui-sanity，desktop+mobile）通过
  - HAR 抓取通过

### 1.2 生产门禁（https://explorer.seth.app）
- 命令：`yarn qa:prod:api-contract`
- 结果：`PASS`
- 证据：`qa-artifacts/prod-checks/api-contract-2026-02-27T07-52-26-017Z.json`

- 命令：`yarn qa:prod:e2e:loop`（3轮）
- 结果：`PASS`
- 证据：`qa-artifacts/prod-e2e-loop/2026-02-27T07-52-42-797Z/summary.json`

- 命令：`yarn qa:prod:data-freshness`
- 结果：`FAIL`
- 证据：`qa-artifacts/prod-checks/freshness-2026-02-27T07-52-28-221Z.json`
- 失败项：
  - `head timestamp lag too large: 20930s > 300s`
  - 当前主高度一致但陈旧：`mainTopHeight=listTopHeight=shard3LatestHeight=4042`
  - `root indexed_pools=0`（当前按 warning 放行）

## 2. 额外运行态核查（生产实机）

### 2.1 后端核心问题（P0）
- PM2 后端进程在线，但日志持续出现：
  - `get_latest_pool_info ... reason={:network, ..., {:error, :econnrefused}}`
  - `all_shards_failed ... falling back to single pool`
- 运行环境当前 RPC：
  - `ETHEREUM_JSONRPC_HTTP_URL=http://35.197.170.240:23001`
  - `SETH_RPC_URL=http://35.197.170.240:23001`
- 从生产机与本地均无法连通候选 RPC：
  - `35.197.170.240:23001` 不通
  - `104.198.109.193:23080` 不通
- 结论：链头不新鲜的直接根因是 **后端到 Seth RPC 不可达**，归因 `BE/Infra`。

### 2.2 前端运行态问题（P0）
- 生产浏览器实测存在首方请求报错（非广告/非CSP）：
  - `/stats` 页面请求 `http://localhost:8080/api/v1/counters`、`/api/v1/lines` -> `ERR_CONNECTION_REFUSED`
  - `/api-docs` 页面请求 `http://localhost:8080/api/v1/docs/swagger.yaml` -> `ERR_CONNECTION_REFUSED`
- 根因：
  - 线上 `envs.js` 配置了
    - `NEXT_PUBLIC_STATS_API_HOST=http://localhost:8080`
    - `NEXT_PUBLIC_VISUALIZE_API_HOST=http://localhost:8081`
  - 这两个地址是浏览器端本机 localhost，不是服务器地址。

### 2.3 前端进程启动方式问题（P1）
- 前端 PM2 当前命令：`yarn start -p 3001`
- 日志持续告警：
  - `"next start" does not work with "output: standalone" configuration`
  - 偶发 `Failed to load static file for page: /404 ... /server/pages/404.html`
- 根因：产物为 `standalone`，但使用了不匹配的启动方式。

## 3. 当前结论（是否“功能全部实现、数据全部正确、前端无报错”）

当前结论：**未达到**。

- 前端交互闭环（匿名主链路）整体可用：`是`
- 生产链上数据新鲜度达标：`否`（P0，后端/RPC不可达）
- 前端“无报错”达标：`否`（P0，stats/api-docs 首方请求报错）

## 4. 下一步修复计划（按优先级）

### 阶段 A（P0，先恢复数据正确）
1. 修复后端 RPC 可达性
   - 更换为可达的 Seth RPC（含 root+shard3，32 pools/分片）
   - 后端重启后观察 30 分钟：
     - 不再出现 `get_latest_pool_info ... econnrefused`
     - `block_catchup` 正向推进
2. 重新跑数据门禁
   - `yarn qa:prod:data-freshness`
   - 目标：`lagSeconds <= 300` 且高度一致性通过

### 阶段 B（P0，清理前端首方报错）
1. 修正生产 `envs.js` 的 stats/visualize 主机配置（禁止浏览器端 localhost）
2. 若后端未提供 stats 微服务：
   - 明确策略二选一并落地：
     - 接入真实 stats 服务地址；或
     - 临时关闭对应功能入口并显示可解释状态，避免请求报错
3. 回归验证：
   - `/stats`、`/api-docs` 页面无 `ERR_CONNECTION_REFUSED`

### 阶段 C（P1，进程稳定性）
1. 前端 PM2 切换为 standalone 正确启动方式
   - 使用 `node .next/standalone/server.js`（保留 `PORT=3001`）
2. 回归 404 路由与日志
   - 不再出现 `Failed to load static file for page: /404`

### 阶段 D（验收）
1. 生产全门禁：
   - `yarn qa:prod:api-contract`
   - `yarn qa:prod:data-freshness`
   - `PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop`
2. 判定标准：
   - 三项全部 `PASS`
   - 无 P0 未关闭项

## 5. 当前阻塞（必须补充）

为推进阶段 A，需要提供：
- Seth 最新可用 RPC 接入信息（生产可达）：
  - `host/port/protocol/path`
  - 是否区分 root/shard3 或同一入口
  - 鉴权要求（如 token/header）

若不提供可达 RPC，数据新鲜度问题无法在前端侧解决。
