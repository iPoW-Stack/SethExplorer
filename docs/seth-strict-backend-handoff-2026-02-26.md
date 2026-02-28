# Seth Strict 生产联调交接文档（2026-02-26）

## 1. 本文目标
本文用于给后端负责人交接当前生产站点 `https://explorer.seth.app/` 的真实状态、已完成修复、测试结果、剩余阻塞和手动复测流程。

## 2. 生产环境核验结果
- 服务器：`34.16.27.175`
- 前端目录：`/home/nickwest2025/explorer-fe`
- 后端目录：`/home/nickwest2025/explorer`
- 进程管理：`pm2`
- Web 层：`nginx`（active）
- PM2 进程：
  - `blockscout-frontend`（`yarn start -p 3001`）
  - `blockscout-backend`

## 3. 从“最初形态”到“当前形态”
### 3.1 最初形态（本次排查前）
- Seth strict 在生产环境缺少关键 env：`NEXT_PUBLIC_SETH_STRICT_MODE`、`NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE`。
- 由于默认值策略，Seth strict 实际落到 `stub` 数据源，出现“UI 看起来正常但数据偏静态/不真实”的风险。
- 地址页 XHS 等级存在前端占位默认值（后端未返回该字段时仍有误导风险）。

### 3.2 当前形态（本次修复后）
- 生产 `public/assets/envs.js` 已显式设置：
  - `NEXT_PUBLIC_SETH_STRICT_MODE: "true"`
  - `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE: "live"`
- 前端已重启并基于最新 strict 实现运行，核心页面走 live 数据链路。
- XHS 占位默认值已改为 `null`（不再伪造 level）。
- 线上导航、搜索、分页、详情跳转、错误态/重试已通过全量自动化回归（见第 6 节）。

## 4. 本次已实施的修复
### 4.1 生产配置修复
- 文件：`/home/nickwest2025/explorer-fe/public/assets/envs.js`
- 修改：补齐 strict 运行开关和数据源，避免回落到 stub。

### 4.2 前端占位字段修复
- 文件：`lib/xStarScore/useFetchXStarScore.ts`
- 修改前：`placeholderData: { data: { level: 'Base' } }`
- 修改后：`placeholderData: { data: { level: null } }`
- 目的：后端未返回 level 时不再显示伪造等级。

### 4.3 生产发布动作
- 已将当前前端代码同步到服务器目录并完成构建。
- 因服务器当前代码库存在大量历史格式差异（CRLF/LF），本次生产构建采用 `next build --no-lint` 产出运行包，再通过 PM2 重启生效。

## 5. FE / BE 边界（当前仍需后端处理）
### 5.1 已确认后端阻塞
- 现网接口存在数据不一致：
  - `/api/v2/main-page/blocks` 最新高度约 `736`
  - `/api/v2/stats` `total_blocks` 为 `994`
- 后端日志持续出现错误：
  - `UndefinedFunctionError: EthereumJSONRPC.Seth.Client.seth_pool_index/0 is undefined or private`
  - `get_latest_pool_info error :connect_timeout`

### 5.2 前端当前策略
- 前端已改为 live 数据，不再使用 strict stub 伪数据掩盖问题。
- 当后端异常时，前端已提供可见错误态/重试入口，不静默失败。

## 6. 测试执行与结果（生产域名）
测试目标域名：`https://explorer.seth.app`

### 6.1 自动化通过项
- `yarn test:e2e:core:live`（14/14 通过）
- `yarn test:e2e:full:live`（整套通过；含一次 token 用例 flaky 后重试通过）
- `yarn test:vitest --run`（226/226 通过，本地代码层回归）

### 6.2 覆盖范围
- P0/P1 公共链路：`/`、`/blocks`、`/txs`、`/block/[id]`、`/tx/[hash]`、`/address/[hash]`、`/search-results`、`/tokens`、`/token/[hash]`、`/token-transfers`、`/internal-txs`、`/verified-contracts`、`/accounts`、`/api-docs`、`/stats`、`/gas-tracker`、`/csv-export`
- 核心交互：导航、搜索、分页、行跳转、详情页关联跳转、权限页 guard、错误态。

### 6.3 体验指标（生产页面实际访问）
- 路由首屏（domcontentloaded + 轻等待）约 2~4 秒：`/`、`/blocks`、`/txs`、`/stats`、`/api-docs`、`/address/*`。
- 未复现此前本地 `next dev` 下 20~90 秒级卡顿。

## 7. 给后端负责人的处理清单
1. 优先修复 Seth 节点/索引链路：`seth_pool_index/0` 未定义问题。
2. 排查池信息超时：`get_latest_pool_info :connect_timeout`。
3. 对齐统计与主列表口径，确保 `/api/v2/stats` 与 `/api/v2/main-page/blocks` 一致。
4. 修复后请通知前端复跑 `test:e2e:full:live` + 核心 HAR 抓包确认。

## 8. 手动测试指南（交接版）
### 8.1 环境准备
- 打开：`https://explorer.seth.app/`
- 清空浏览器缓存后强刷一次（`Ctrl+F5`）。

### 8.2 测试步骤与预期
1. 首页加载
- 操作：访问 `/`
- 预期：左侧菜单含 `Dashboard/Blocks/Transactions/Addresses/Tokens` 和 `Charts/API`；卡片、最新区块、最新交易可见。

2. 导航切换
- 操作：依次点击 `Blocks -> Transactions -> Charts -> API`
- 预期：路由正确跳转，菜单不消失，页面无长时间白屏。

3. 搜索
- 操作：顶部搜索框分别输入区块号、交易 hash、地址并回车
- 预期：进入 `search-results` 或直接跳详情页；无永久 loading。

4. 列表分页和跳转
- 操作：在 `/blocks`、`/txs` 点击行链接和分页按钮
- 预期：可跳详情；分页有效；URL 参数变化正确。

5. 详情页关联链接
- 操作：在 `/block/[id]`、`/tx/[hash]`、`/address/[hash]` 点击 hash/address/block 链接
- 预期：都能跳转到对应详情页；复制按钮可用。

6. 统计/API 页面
- 操作：访问 `/stats`、`/api-docs`
- 预期：页面可进入终态（有数据或明确错误提示+重试），不出现无限骨架。

7. 数据正确性抽检
- 操作：对比首页最新区块高度与 `/api/v2/main-page/blocks`
- 预期：前端展示应与接口一致。
- 备注：若与 `/api/v2/stats` 统计冲突，按后端阻塞处理（第 5 节）。

## 9. 当前结论
- 前端核心功能链路已达可交付状态。
- 本次已修复前端关键误配（strict live）和误导占位字段（XHS level 默认值）。
- 现存主要风险已收敛到后端索引/接口一致性问题，已提供明确证据和处理方向。
