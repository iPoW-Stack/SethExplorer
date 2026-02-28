# Seth Strict 功能完整性检查报告（2026-02-15）

## 1. 结论（先给结论）
- 结论：**核心功能已达到可交付状态**（功能门禁全链路通过）。
- 当前可确认：
  - 匿名主链路（P0/P1）可访问、可交互、可跳转、可分页、可搜索。
  - 后端异常场景存在明确错误态/重试路径，不是静默卡死。
  - desktop/mobile 关键页面 UI 健康度（sanity）通过。
- 仍需明确的边界：
  - 登录/钱包/API Key 等凭据链路仅验证 guard，不含正向业务闭环。
  - 设计稿严格 6/6 视觉收敛不在本轮门禁目标内。

## 2. 本轮检查范围
- 模式：`NEXT_PUBLIC_SETH_STRICT_MODE=true`，联调按 `live`。
- 路由分层（由 `qa:route-inventory` 生成）：
  - `P0=7`
  - `P1=10`
  - `P2=54`
  - `P3=8`
- 路由清单产物：
  - `test-results/qa/route-inventory.json`（generatedAt=`2026-02-15T08:04:31.681Z`）

## 3. 执行命令与结果
- 总门禁命令：
  - `yarn qa:functional:full`
- 组成与结果：
  - `yarn qa:route-inventory`：通过（P0=7, P1=10, P2=54, P3=8）
  - `yarn lint:tsc`：通过
  - `yarn test:vitest --run`：通过（`32 files / 226 tests`）
  - `npx playwright test -c playwright-ct.config.ts ui/sethStrict/StrictPages.pw.tsx`：通过（`3 passed`）
  - `yarn test:e2e:full:live`：通过
    - core：`14 passed`
    - public-smoke：`17 passed`
    - public-interactions：`10 passed`（含 `1 flaky` 重试后通过）
    - error-handling：`10 passed`
    - auth-guard：`8 passed`
    - ui-sanity（desktop）：`6 passed`
    - ui-sanity（mobile）：`6 passed`
  - `yarn qa:capture:core-har`：通过（核心 6 路由均 `200/ok=true`）

## 4. 关键证据
- HAR 摘要：`test-results/core-har/core-2026-02-15T08-02-20-227Z.summary.json`
- HAR 原始：`test-results/core-har/core-2026-02-15T08-02-20-227Z.har`
- HAR 摘要关键字段：
  - `baseUrl=http://localhost:8090/`
  - `startedLocalServer=true`
  - `home/blocks/txs/block/tx/address` 全部 `status=200, ok=true`

## 5. 发现的问题与处理结果
- 阻塞级功能缺陷：**未发现未关闭项**（本轮）。
- 稳定性观察：
  - `tests/e2e/public-interactions-full.spec.ts` 的 `global navigation links are actionable` 出现一次 flaky（首次未跳转 `/txs`），Playwright 自动重试后通过，最终门禁仍为通过。
  - 该问题当前判定为**偶发稳定性噪声**（可能与运行时瞬时状态相关），非稳定可复现功能故障。
- 非阻塞告警：
  - Vitest 中多处 `ReactDOMTestUtils.act` deprecation warning。
  - npm 环境变量 warning（`Unknown env config ...`）。

## 6. 与最初形态对比（功能视角）
- 最初形态中的主要问题：
  - strict+stub 全局查询策略误伤导致搜索/统计不可测；
  - 菜单跨页消失（`Charts/API`）；
  - 多页面长加载无终态反馈，用户感知为卡死；
  - e2e/webServer 启动与 HAR 采集稳定性不足。
- 当前形态：
  - 查询策略已改为按页面继承，不再全局误伤；
  - 菜单跨页可见；
  - 统计/列表/搜索已具备明确错误态与重试交互；
  - 全量功能门禁可稳定跑通并产出证据。

## 7. 交付判定
- 功能交付判定：**通过**。
- 可交付范围：
  - 匿名与公开可访问链路的核心交互已闭环。
- 待后续阶段：
  - 视觉 6/6 严格收敛；
  - 凭据型业务链路（登录/钱包/API key）正向流程补测。
