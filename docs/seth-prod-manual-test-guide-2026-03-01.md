# Seth Explorer 生产手动测试指南（2026-03-01）

目标站点：`https://explorer.seth.app`

## 1. 核心功能回归（必须）
1. 首页 `/`
- 检查最新区块卡片、最新交易卡片是否加载。
- 点击 `View All` 分别跳转到 `/blocks`、`/txs`。

2. 列表页
- `/blocks`：点击区块高度、miner 地址可跳转。
- `/txs`：点击 tx hash、from/to、block 可跳转。
- 分页前后翻页可用，URL `next_page_params` 生效。

3. 详情页
- `/block/[id]`：miner、交易链接可点击。
- `/tx/[hash]`：from/to/block 链接与复制按钮可用。
- `/address/[hash]`：交易表跳转与分页可用。

4. 搜索
- 输入 block number / tx hash / address，回车后落地正确结果。

## 2. 品牌验收（必须）
1. 浏览器标签页图标为 Seth 图标。
2. `/stats` 页面图表无 `Blockscout` 可见水印。
3. 页面 title/文案无 Blockscout 可见残留。

## 3. 数据口径抽检（必须）
1. 打开 `/api/v2/transactions?items_count=5`，记录一笔交易 hash 与 `block_number`。
2. 打开 `/api/v2/transactions/{hash}`，确认 `block_number` 一致。
3. 连续使用 `next_page_params` 翻页，确认 `block_number` 递减且无回跳到本地 4k 主字段。

## 4. 实时性验收（当前阻塞项）
1. 打开 `/api/v2/main-page/blocks`，观察第一条 `timestamp`。
2. 与当前时间对比，若长期超过 300 秒且不推进，判定实时性不通过。
3. 同时查看 `/api/v2/seth/live-head`：
- `source_state` 若长期 `degraded/down`，且 `global_head.timestamp` 长期不更新，判定后端链路阻塞。

## 5. 预期结果
- 功能项：全部通过。
- 品牌项：全部通过。
- 实时项：当前版本可能因 RPC 网络阻塞失败（已记录为后端 P0 阻塞，不属于前端交互缺陷）。
