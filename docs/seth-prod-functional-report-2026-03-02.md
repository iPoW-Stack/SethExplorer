# Seth Explorer 生产功能报告（2026-03-02）

## 一、验收目标
- 验收环境：`https://explorer.seth.app`
- 范围：主站 + 全部可访问子页面（路由矩阵）
- 目标：数据可观测、功能完整、全站可访问、无可见 Blockscout 品牌残留

## 二、本轮已完成事项
1. 前端发布链路修复并完成上线
- 解决 Linux 构建被 CRLF lint 阻断的问题（发布构建使用 `next build --no-lint`）。
- 新版本已运行于：
  - `/home/nickwest2025/releases/explorer-fe-20260302-221047`
- PM2 已切换到新 release 目录运行：
  - `blockscout-frontend` `exec cwd=/home/nickwest2025/releases/explorer-fe-20260302-221047`

2. UI 改进计划 Phase 1 已上线
- 统一空状态组件：`ExplorerEmptyState`
- 分片状态语义化标签：`Healthy/Degraded/Unavailable`
- Block 详情页新增 Prev/Next
- 交易列表交互增强（状态图标、Method badge、复制反馈）
- API Docs 可见品牌文案清理
- Seth favicon 资源链路已生效

3. 生产 QA 能力补齐
- 新增/启用：
  - `qa:prod:ui-recommendations`
  - `qa:prod:ui-full:3x`
  - `qa:prod:fullsite:3x:maintenance`
  - `qa:prod:data-freshness:maintenance`
- `prod-data-freshness` 维护模式逻辑已强化：
  - 链暂停但多源高度一致时，时间戳老化降级为 warning，避免误报 FE 回归。
- 已修复 `/stats/[id]` SSR 预取链路：
  - 当 stats-service 未启用时不再请求 `stats:line`，避免后台持续 404 噪声。

## 三、结果证据
1. 严格 UI 全链路 3 轮通过（生产）
- 命令：
  - `PROD_BASE_URL=https://explorer.seth.app E2E_BASE_URL=https://explorer.seth.app yarn qa:prod:ui-full:3x`
- 产物：
  - `qa-artifacts/prod-ui-full-loop/2026-03-02T13-24-47-201Z/summary.json`

2. 全站维护模式 3 轮通过（生产）
- 命令：
  - `PROD_BASE_URL=https://explorer.seth.app E2E_BASE_URL=https://explorer.seth.app yarn qa:prod:fullsite:3x:maintenance`
- 产物：
  - `qa-artifacts/prod-fullsite-loop/2026-03-02T14-27-47-698Z/summary.json`

3. 品牌检查通过
- 命令：
  - `PROD_BASE_URL=https://explorer.seth.app yarn qa:prod:branding`
  - `node tools/qa/prod-ui-branding-scan.mjs`
- 结果：
  - favicon 为 Seth 资源链路
  - 运行时 UI 品牌扫描 PASS

## 四、当前生产观察
- 观测到链头存在调试期停顿（例如高度与时间戳在短窗口不前进）。
- 在停顿窗口中：
  - 严格 freshness（`<=120s`）可能失败；
  - 维护模式门禁可继续验证前端功能/UI 是否回归。
- `root` 分片仍为 `indexed_pools=0`，前端已显式展示 unavailable，不进行伪造。

## 五、结论
- 前端版本已成功上线到生产新 release，核心功能、全站可访问性、UI 改进项已落地并可验证。
- 当前唯一不稳定因素来自链侧出块节奏（调试窗口），不是前端交互回归。
