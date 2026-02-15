# Seth Strict Functional Report (2026-02-14)

## 1) 目标与范围
- 本轮目标：功能优先，完成 Seth strict 匿名高频链路全量测试与联调修复，不强制本轮达成设计 6/6。
- 覆盖范围：
  - P0：`/`、`/blocks`、`/txs`、`/block/[id]`、`/tx/[hash]`、`/address/[hash]`、`/search-results`
  - P1：`/tokens`、`/token/[hash]`、`/token-transfers`、`/internal-txs`、`/verified-contracts`、`/accounts`、`/api-docs`、`/stats`、`/gas-tracker`、`/csv-export`
  - P3（无凭据）：`/login`、`/auth/profile`、`/account/*` guard 行为

## 2) 本轮代码与测试调整
- 新增稳定性门禁脚本：
  - `tools/qa/run-functional-gate-3x.mjs`
  - 支持串行多轮 `qa:functional:full`，并按时间戳归档 `playwright-report` 与 `test-results`
- 新增 npm 脚本：
  - `package.json` -> `qa:functional:full:3x`
- 强化 strict live 注入可靠性：
  - `tests/e2e/utils.ts`
  - 用 `Object.defineProperty(window, '__envs', ...)` 保证 `envs.js` 后续赋值不覆盖 `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE=live`
- 强化错误处理 e2e：
  - `tests/e2e/error-handling.spec.ts`
  - 新增强制失败场景（`500`/`abort`），并校验显式错误态或可用降级态
- 修复全量交互测试中的搜索波动：
  - `tests/e2e/public-interactions-full.spec.ts`
  - 首页搜索在“searching”阶段增加重试提交逻辑，消除随机失败

## 3) 门禁执行结果
- 路由清单：
  - `yarn qa:route-inventory` 通过
  - 产物：`test-results/qa/route-inventory.json`
  - 结果：`P0=7, P1=10, P2=54, P3=8`
- 连续门禁：
  - 既有基线（第 1 轮）已通过（本次中断恢复前已完成）
  - 新增第 2、3 轮连续通过，归档见：
    - `qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/summary.json`
    - `qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/round-02-2026-02-14T14-23-37-520Z`
    - `qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/round-03-2026-02-14T14-59-56-599Z`
- 最新 HAR：
  - `test-results/core-har/core-2026-02-14T14-57-48-613Z.summary.json`
  - `test-results/core-har/core-2026-02-14T14-57-48-613Z.har`
  - 核心 6 路由状态均 `200 / ok=true`

## 4) 结论
- 功能门禁达到计划要求：连续 3 轮通过（1 轮既有 + 本轮新增 2 轮）。
- P0/P1 未发现未关闭 FE 功能缺陷。
- 本轮未引入明显 UI 破版（desktop/mobile sanity 通过）。
- 设计稿严格 6/6 仍维持后续阶段处理，不在本轮强制收敛。

## 5) 已知事项
- `public/assets/envs.js` 默认 `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE="stub"`。
- e2e 通过 `tests/e2e/utils.ts` 在浏览器侧强制覆盖为 `live`，该行为已文档化并纳入回归链路。
