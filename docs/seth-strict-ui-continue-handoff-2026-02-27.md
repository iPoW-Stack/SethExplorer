# Seth Strict UI 续跑交接（2026-02-27）

## 1. 当前基线
- 运行基线：`http://localhost:8095`
- 设计基线：`http://34.126.98.218:8082/`
- 审计阈值：Desktop `>=97`，Mobile `>=96`，`loading_blocked=false`
- 最新报告时间：`2026-02-27T05:55:18.932Z`
- 最新结论：`0/6`（Desktop 未过线，Mobile 全通过）

## 2. 本轮已完成
### 2.1 审计与稳定性
- 反复执行：
  - `node ./tools/design-audit/capture-runtime.mjs`
  - `yarn audit:design:compare`
  - `yarn audit:design:report`
  - `yarn audit:design:check`
- 结果稳定：`loading_blocked=false`（双端 6 页全为 false）

### 2.2 本轮代码调整（已落地）
- `ui/snippets/header/HeaderDesktop.tsx`
  - strict header 玻璃层参数向设计稿收敛：`bg rgba(4,6,8,0.8)`，`blur(4px)`。
  - strict 搜索区宽度改为 `maxW="2xl"`。
- `ui/snippets/searchBar/SearchBarInput.tsx`
  - strict 模式去除 form 外层边框与背景，保留输入框主体。
  - strict 输入框高度调为 `36px`，字号 `14px`，背景改为 `seth.card`。
- `ui/sethStrict/StrictHome.tsx`
  - Home 列表链接颜色与字重向设计稿收敛（主链接/次级绿链区分）。
- `ui/sethStrict/StrictBlocksPage.tsx`
  - Miner 链接颜色调整为设计稿风格绿链。
- `ui/sethStrict/StrictTransactionsPage.tsx`
  - hash 使用 mono 风格；from/to 改为次级绿链。
- `ui/sethStrict/StrictAddressPage.tsx`
  - 表格列宽重分配。
  - hash 使用 mono，block/from/to 链接配色和 `(You)` 胶囊样式对齐设计稿。
- `toolkit/theme/foundations/colors.ts`
  - `green`、`gray` 色阶统一为更接近设计稿的 Tailwind 色阶。

### 2.3 编译验证
- `yarn lint:tsc`：PASS

## 3. 最新审计分数（当前有效）
- Home：Desktop `95.74` / Mobile `98.06`
- Blocks：Desktop `96.37` / Mobile `98.34`
- Txs：Desktop `96.37` / Mobile `98.33`
- Block Detail：Desktop `96.09` / Mobile `97.99`
- Tx Detail：Desktop `96.21` / Mobile `98.20`
- Address Detail：Desktop `95.65` / Mobile `98.06`
- 总结：`passCount=0/6`

## 4. 当前判断（关键）
- 移动端已稳定过线，瓶颈完全在 Desktop。
- Desktop 分数集中卡在 `95.6~96.4`，属于“全局细粒度差异累积”而非单点崩坏。
- 主要差异热点：
  - 顶部 header 区域（搜索条、右上动作区、字体渲染）
  - 详情页和 Address 页首屏密度/色彩层次
  - 全局字体抗锯齿与图标风格（FontAwesome 原型 vs Chakra/React 图标）

## 5. 下一阶段执行方案（继续推进 6/6）
1. 先做 **Header/Desktop 全页壳层像素对齐**：
   - 统一 strict 的搜索框结构与图标尺寸，逐像素对齐 `index/blocks/txs` 三页头部。
2. 再做 **Detail 三页首屏重排**（`Block -> Tx -> Address`）：
   - 按设计稿重新核对标题行、overview 行高、字段间距、浅色文本层级。
3. 最后做 **全局字体与图标策略统一**：
   - 尽量减少组件库默认渲染差异，降低全局 MAE。
4. 每完成一个页面立即回归审计，不等全部改完再跑。

## 6. 可直接继续执行的命令
```bash
yarn lint:tsc
$env:RUNTIME_BASE_URL='http://localhost:8095'; node ./tools/design-audit/capture-runtime.mjs
yarn audit:design:compare
yarn audit:design:report
yarn audit:design:check
```
