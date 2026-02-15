# Seth 严格对照中断恢复检查单（2026-02-12）

## 基线说明
- 设计基线：`http://34.126.98.218:8082/`
- 运行基线：`RUNTIME_BASE_URL`（默认 `http://localhost:8080`）
- 当前严格目标：`6/6`
- 说明：恢复阶段先保证运行截图来源正确，再收敛 UI 差异。

## 页面差异清单

## 1. Home `/`
- 壳层：侧栏分组、Header 密度与设计稿保持一致。
- 标题区：保持 4 张 stats 卡片。
- 主内容：保持 `Latest blocks` + `Latest transactions` 双列。
- 严格模式：隐藏 Hero/Highlights/ChainIndicators/AdBanner。

## 2. Blocks `/blocks`
- 壳层：页头与主容器留白对齐。
- 标题区：`Blocks` 标题、总量与分页区域位置对齐。
- 表格区：列顺序、表头高度、行高、Gas 进度条样式对齐。
- 严格模式：仅保留主表视图。

## 3. Transactions `/txs`
- 壳层：页头动作区与搜索区密度对齐。
- 标题区：`Transactions` 标题与统计文案对齐。
- 表格区：Method Badge、地址截断、Fee/Value 字重对齐。
- 严格模式：隐藏高级过滤与扩展 tab。

## 4. Block `/block/[id]`
- 壳层：标题行图标、`Mined by`、时间信息顺序对齐。
- 详情区：Overview 字段顺序与分组对齐。
- 严格模式：首屏仅展示 Overview，不将扩展 tab 纳入首屏审计。

## 5. Tx `/tx/[hash]`
- 壳层：标题和副标题密度对齐。
- 详情区：Status/Block/From/To/Value/Fee 顺序和样式对齐。
- 严格模式：首屏仅展示 Overview，Logs/State/Trace 降级二级入口。

## 6. Address `/address/[hash]`
- 壳层：地址标题、复制动作、标签密度对齐。
- 首屏区：Balance 卡 + Token Holdings 卡 + Transactions 表。
- 严格模式：隐藏 clusters/widgets/mud 等非设计模块。

## 中间门槛
1. 壳层完成后：`home/blocks/txs` desktop `>=95`。
2. 列表页完成后：`home/blocks/txs` desktop + mobile 达标。
3. 详情页完成后：`passCount=6/6`。
