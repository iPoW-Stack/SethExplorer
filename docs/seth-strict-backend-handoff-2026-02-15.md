# Seth Strict 前后端联调交接文档（2026-02-15）

## 1. 文档目的
本文用于后端同学接手联调与回归，覆盖：
- 项目从“最初形态”到“当前形态”的关键变化；
- 本轮任务完成情况与验证证据；
- 前后端边界、已修复项、待后端关注项；
- 可直接执行的手动复测流程与预期结果。

## 2. 版本与范围
- 基线日期：2026-02-12 ~ 2026-02-15
- 运行模式：`NEXT_PUBLIC_SETH_STRICT_MODE=true`
- 联调数据源：`live`（自动化中强制注入）
- 功能范围：
  - P0：`/`、`/blocks`、`/txs`、`/block/[id]`、`/tx/[hash]`、`/address/[hash]`、`/search-results`
  - P1：`/tokens`、`/token/[hash]`、`/token-transfers`、`/internal-txs`、`/verified-contracts`、`/accounts`、`/api-docs`、`/stats`、`/gas-tracker`、`/csv-export`
  - P3（无凭据）：`/login`、`/auth/profile`、`/account/*` 的 guard 行为

## 3. 最初形态（问题基线）
### 3.1 功能侧初始问题
- Seth strict 早期以静态展示为主，存在“视觉可用但功能不闭环”风险。
- `Charts/API` 菜单只在首页显示，跨页面会消失。
- `Seth statistic & data` 在后端慢/异常场景下，用户感知为长时间卡住。
- 搜索链路在 strict+stub 场景曾被全局查询策略误伤，存在不可测/不可用情况。
- 本地手测体验受 `next dev` 冷编译影响（首次打开和首次切换慢）。

### 3.2 质量与门禁侧初始问题
- e2e 曾出现 `webServer timeout` 与 dev 进程并发启动冲突，稳定性不足。
- 核心 HAR 采集偶发因端口/运行时选择不稳定而产生假失败。
- 设计审计基线仍是 0/6（仅说明视觉收敛未完成，不代表功能不可用）。

## 4. 当前形态（本轮交付后）
### 4.1 功能可用性状态
- 匿名高频链路已形成闭环：导航、搜索、分页、行跳转、详情关键链接、错误态/重试均可验证。
- Seth strict 下不再允许明显“可见但不可用”的核心交互。
- 后端异常时，关键页面具备可见终态（错误提示或重试入口），避免静默卡死。

### 4.2 用户体验状态
- 新增 `dev:ready` 一键就绪流程，将冷编译等待前置到自动预热流程。
- 统计页、区块列表、交易列表、搜索结果页补齐“长加载提示 + Retry/降级可见状态”。
- 搜索结果页补齐空态提示，避免“空白但无解释”。

## 5. 代码级改动清单（关键）
### 5.1 查询策略与 strict 行为
- `lib/api/useApiQuery.tsx`
  - 移除 strict+stub 全局禁用查询的误伤逻辑。
  - 新增 `strictStubPolicy?: 'inherit' | 'force-disable'`，默认 `inherit`。
  - 结果：非目标页面（尤其搜索/统计）不再被意外阻断。

### 5.2 导航与壳层可用性
- `ui/snippets/navigation/vertical/NavigationDesktop.tsx`
  - 修复 Seth strict 下 `Charts/API` 菜单跨路由消失问题，改为全路由可见。

### 5.3 关键页面可观测性与重试
- `ui/pages/Stats.tsx`
  - 新增长加载告警与 `Retry`。
- `ui/sethStrict/StrictBlocksPage.tsx`
  - 新增长加载告警、明确空态、`Retry`。
- `ui/sethStrict/StrictTransactionsPage.tsx`
  - 新增长加载告警、明确空态、`Retry`。
- `ui/pages/SearchResults.tsx`
  - 新增搜索长加载与重定向检查长等待告警；
  - 增加 `Retry` 与 `Show results` 操作；
  - 新增空结果提示；
  - 修复搜索词引号渲染异常。

### 5.4 QA 运行基础设施
- `tools/qa/start-dev-ready.mjs`
  - 一键启动/复用 dev 服务、等待健康、自动预热关键路由。
- `tools/qa/warmup-runtime-routes.mjs`
  - 扩展预热路由：`/stats`、`/api-docs`。
- `tools/qa/capture-core-har.mjs`
  - 默认优先 `http://localhost:8090`（支持 `RUNTIME_BASE_URL`/`E2E_BASE_URL` 覆盖）；
  - 增加回退端口策略，降低本地端口混用导致的假失败。

## 6. 任务完成情况（对照本轮目标）
### 6.1 已完成
- 功能优先目标完成：匿名主链路无死按钮/死链接/死分页/死搜索。
- 全量功能门禁在本轮执行通过（详见第 7 节证据）。
- 关键 UX 问题已修复：菜单消失、长加载无反馈、搜索不可测、启动体验差。
- 后端交接文档已更新为中文并补齐技术细节。

### 6.2 未在本轮完成（明确范围外）
- 设计稿严格视觉 6/6 收敛仍未完成（当前仍以“功能优先”策略执行）。
- 登录/钱包/API Key 等需要凭据的正向业务链路未做端到端正向闭环（仅验证 guard 行为）。

## 7. 测试执行与证据
### 7.1 本轮核心门禁命令
- `yarn qa:functional:full`
  - 包含：
    - `yarn qa:route-inventory`
    - `yarn lint:tsc`
    - `yarn test:vitest --run`
    - strict CT：`npx playwright test -c playwright-ct.config.ts ui/sethStrict/StrictPages.pw.tsx`
    - `yarn test:e2e:full:live`
    - `yarn qa:capture:core-har`

### 7.2 本轮结果（2026-02-15）
- `lint:tsc`：通过
- `vitest`：`226 passed`
- strict CT：`3 passed`
- e2e full live：全部套件通过（core/public/error/auth/ui-sanity，desktop+mobile）
- core HAR：6 条核心路由全部 `200 / ok=true`

### 7.3 证据文件
- 路由清单：`test-results/qa/route-inventory.json`
- 路由分层快照：`qa-artifacts/functional-2026-02-15/route-inventory.json`
- HAR 摘要：`test-results/core-har/core-2026-02-15T01-50-05-631Z.summary.json`
- HAR 原始文件：`test-results/core-har/core-2026-02-15T01-50-05-631Z.har`
- HAR 摘要快照：`qa-artifacts/functional-2026-02-15/core-har-summary.json`

## 8. 前后端边界与后端关注点
### 8.1 FE 已确保
- 当接口慢/失败时，关键 strict 页面不再静默卡住，用户可见错误/警告并可重试。
- 搜索与导航链路具备完整前端交互闭环。

### 8.2 BE 需重点持续关注的接口
- `/api/v2/blocks`
- `/api/v2/transactions`
- `/api/v2/blocks/{height_or_hash}`
- `/api/v2/transactions/{hash}`
- `/api/v2/addresses/{hash}`
- `/api/v2/addresses/{hash}/tabs-counters`
- `/api/v2/addresses/{hash}/transactions`
- `/api/v2/addresses/{hash}/tokens`
- `/api/v2/main-page/indexing-status`
- `/api/v2/config/backend-version`
- `/api/v1/metadata`
- `/api/v1/{chainId}/addresses:lookup`

### 8.3 运行时配置说明（必须知晓）
- `public/assets/envs.js` 默认 `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE="stub"`。
- 自动化 live 联调会在浏览器运行时覆盖为 `live`，因此本报告的功能结论基于真实后端联调数据，不是 stub 视觉占位结果。

## 9. 手动复测流程（给后端）
1. 启动前端：
   - `yarn dev:ready`
   - 预期：终端出现 `READY`，并完成关键路由预热。
2. 验证导航：
   - 连续访问 `/` -> `/blocks` -> `/txs` -> `/stats` -> `/api-docs`
   - 预期：切换可用，侧栏 `Charts/API` 全程可见。
3. 验证搜索：
   - 在 Header 输入区块号、交易哈希、地址并回车
   - 预期：进入 `search-results` 或直接跳详情页；无永久 searching 状态。
4. 验证列表页：
   - `/blocks`、`/txs`、`/tokens`
   - 预期：行链接可点击，分页按钮有动作。
5. 验证详情页：
   - `/block/[id]`、`/tx/[hash]`、`/address/[hash]`
   - 预期：关键字段链接可跳转，复制/分页等交互可用。
6. 验证异常场景：
   - 后端异常时观察页面
   - 预期：有明确错误/警告及 Retry；不应白屏或无限骨架。

## 10. 下阶段建议（交接后）
- 功能已达可交付状态，建议进入下一阶段：
  - 在不破坏现有功能门禁前提下，按 `Home -> Blocks -> Txs -> Block -> Tx -> Address` 继续推进 Seth strict 视觉 6/6 收敛。

## 11. 本次新版功能报告
- 最新完整功能检查报告：
  - `docs/seth-strict-functional-report-2026-02-15.md`
- 报告内容包含：
  - 全门禁执行结果、e2e分项结果、HAR证据、最初形态到当前形态的功能变化与当前风险说明。
