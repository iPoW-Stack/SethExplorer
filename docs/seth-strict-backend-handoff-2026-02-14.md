# Seth Strict Backend Handoff Log (2026-02-14)

## 1) 当前交付状态
- 本轮以“功能完整性”优先完成联调门禁。
- 连续 3 轮门禁结果：
  - 第 1 轮：既有基线已通过（中断恢复前）
  - 第 2/3 轮：本轮补齐并通过，见 `qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/summary.json`
- 最新核心 HAR：`test-results/core-har/core-2026-02-14T14-57-48-613Z.summary.json`（6 条核心路由均 `200`）。

## 2) 前端本次调整（供后端知悉）
- 新增多轮门禁脚本与归档能力：
  - `tools/qa/run-functional-gate-3x.mjs`
  - `package.json`：`qa:functional:full:3x`
- 强化 strict live 环境注入（避免被 `envs.js` 覆盖）：
  - `tests/e2e/utils.ts`
- 强化错误处理联调验证：
  - `tests/e2e/error-handling.spec.ts`
  - 增加 `500/abort` 强制失败注入
- 修复交互测试搜索波动：
  - `tests/e2e/public-interactions-full.spec.ts`

## 3) 后端重点关注接口
- 核心链路：
  - `/api/v2/blocks`
  - `/api/v2/transactions`
  - `/api/v2/blocks/{height_or_hash}`
  - `/api/v2/transactions/{hash}`
  - `/api/v2/addresses/{hash}`
  - `/api/v2/addresses/{hash}/tabs-counters`
  - `/api/v2/addresses/{hash}/transactions`
  - `/api/v2/addresses/{hash}/tokens`
- 壳层稳定性：
  - `/api/v2/main-page/indexing-status`
  - `/api/v2/config/backend-version`
- 辅助：
  - `/api/v1/metadata`
  - `/api/v1/{chainId}/addresses:lookup`

## 4) 手动复测流程（desktop + mobile）
1. 启动前端：
   - `D:\\Dapp\\explorer-fe`
   - `node_modules\\.bin\\next dev -p 8090`
2. desktop 访问并操作：
   - `/`：搜索输入区块号并提交，应进入 `search-results`
   - `/blocks`：点击第一行区块链接、翻页按钮可用
   - `/txs`：点击交易 hash 链接、翻页按钮可用
   - `/block/18249102`：矿工地址链接可跳转 `address`
   - `/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6`：block/from/to 链接可跳转
   - `/address/0x1234567890abcdef1234567890abcdef12345678`：交易行链接与分页可用
3. mobile 复测：
   - 同上 6 个核心页面首屏无明显错位/遮挡/横向溢出。
4. 运行门禁：
   - `yarn qa:functional:full`
   - 或 `yarn qa:functional:full:3x`

## 5) 预期结果
- 匿名可访问链路无死按钮、死链接、死分页、死搜索。
- 后端异常时：
  - `blocks/txs/block/tx` 可出现显式错误态与 Retry。
  - `address` 可能走可用降级态（不一定展示显式错误条），但页面应保持可操作、不崩溃。
- `auth/profile` 与 `account/*` 在无凭据条件下表现为 guard-safe（可重定向或受限提示），不应出现白屏或崩溃。

## 6) 重要说明
- `public/assets/envs.js` 默认 `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE="stub"`。
- 自动化联调中已通过浏览器注入强制 `live`，确保本轮结果是对后端真实联调而非 stub 视觉占位。
