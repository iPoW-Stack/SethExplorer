# Seth Explorer 生产手动测试指南（2026-02-28）

## 1. 测试环境
- 目标站点：`https://explorer.seth.app`
- 推荐浏览器：Chrome 最新版
- 视口：
  - Desktop：`1920x1080`
  - Mobile 模拟：`390x844`

## 2. 冒烟流程（10 分钟）

### 2.1 首页与导航
1. 打开 `/`。
- 预期：首屏可见统计卡、最新 blocks、最新 txs；无长期 skeleton。

2. 点击侧栏：`Dashboard -> Blocks -> Transactions -> Stats -> API Docs`。
- 预期：页面可在 2~5 秒内响应切换；无白屏、无报错弹层。

### 2.2 搜索闭环
1. 在 Header 搜索框输入 block 高度（例如首页首行高度）。
- 预期：可跳转 block 详情页。

2. 输入 tx hash（从首页最新交易复制）。
- 预期：可跳转 tx 详情页。

3. 输入 address（从 block/tx 页复制）。
- 预期：可跳转 address 详情页。

### 2.3 列表与分页
1. `/blocks` 点击任意行 block 高度与 miner。
- 预期：分别跳转 `/block/[id]` 与 `/address/[hash]`。

2. `/txs` 点击 tx hash、block、from/to。
- 预期：全部可跳转到对应详情。

3. 在 `/blocks`、`/txs` 使用分页前后按钮。
- 预期：分页有效，URL 参数更新，返回后状态一致。

### 2.4 详情页交互
1. `/block/[id]`：点击 miner / fee recipient 链接。
- 预期：可跳转地址页。

2. `/tx/[hash]`：点击 from/to/block/hash 相关链接。
- 预期：可跳转。

3. `/address/[hash]`：点击交易列表行和分页。
- 预期：可跳转 tx 详情，分页可用。

### 2.5 公共高频页
依次访问：
- `/tokens`
- `/token-transfers`
- `/internal-txs`
- `/verified-contracts`
- `/accounts`
- `/gas-tracker`
- `/csv-export`
- 预期：均可打开，主区域有明确终态（数据或错误提示+重试）。

## 3. 数据正确性核对（5 分钟）

### 3.1 分片结构
打开 `https://explorer.seth.app/api/v2/stats`。
- 预期：`seth_shards` 中至少有 `root` 与 `shard3`。
- 预期：每个分片 `pool_count=32` 且 `pools.length=32`。

### 3.2 链头一致性
1. 记录 `/api/v2/main-page/blocks` 第一条 `height`。
2. 在 `/api/v2/stats` 查 `shard3.latest_height`。
- 预期：两者差值 `<=2`。

### 3.3 链头新鲜度
查看 `/api/v2/main-page/blocks` 第一条 `timestamp`。
- 预期：与当前 UTC 时间差小于 300 秒。

## 4. 权限边界测试
无登录状态访问：
- `/login`
- `/auth/profile`
- `/account/api-key`
- `/account/watchlist`
- 预期：不崩溃；出现重定向或 guard 安全提示。

## 5. 错误态测试（可选）
在后端短暂重启期间刷新 `/blocks` 或 `/txs`。
- 预期：页面出现明确错误态/重试入口；恢复后可继续使用。

## 6. 判定标准
- 通过：无死按钮、死链接、死分页、死搜索；数据口径一致；无前端致命报错。
- 不通过：任一核心链路出现白屏、无限 loading、点击无效、数据明显错位。
