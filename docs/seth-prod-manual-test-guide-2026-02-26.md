# Seth Explorer 生产手动测试指南（2026-02-26，最终版）

## 1. 测试目标
- 验证生产站点 `https://explorer.seth.app/` 在匿名场景下功能完整可用。
- 验证链上数据展示正确（分片结构、区块高度一致、搜索/跳转闭环）。
- 验证后端异常时前端有明确错误态，不白屏、不无限骨架。

## 2. 测试前准备
- 浏览器：Chrome 最新稳定版。
- 使用无痕窗口，避免缓存干扰。
- 打开开发者工具 Network（可选），便于观察是否有 5xx。

## 3. P0 核心流程（必须通过）
1. 打开首页 `/`。
- 预期：首屏可正常渲染；侧栏菜单完整显示（Dashboard/Blocks/Transactions/Addresses/Tokens/Charts/API）。

2. 侧栏连续切换。
- 操作：`/blocks -> /txs -> /stats -> /api-docs -> /`。
- 预期：每页都能进入；菜单不消失；无白屏。

3. 搜索闭环。
- 操作：在 Header 搜索框分别输入：
  - 区块高度（例如当前顶部高度）
  - 交易 hash
  - 地址
- 预期：能落到对应详情页或 `search-results`，无永久 searching。

4. 列表页交互。
- 操作：在 `/blocks`、`/txs`、`/tokens` 点击首行链接，并点击下一页。
- 预期：链接可跳转；分页可用；URL 参数与分页状态一致。

5. 详情页交互。
- 操作：
  - `/block/[id]` 点击 `Mined by/Fee recipient`。
  - `/tx/[hash]` 点击 `Block/From/To`。
  - `/address/[hash]` 点击交易列表 hash 与分页。
- 预期：全部可跳转，无死链接。

## 4. 数据正确性检查（必须通过）
1. 分片结构。
```bash
curl -s https://explorer.seth.app/api/v2/stats | jq '.seth_shards | map({name,network,pool_count,pools_len:(.pools|length),indexed_pools,latest_height})'
```
- 预期：存在 `root` 与 `shard3`；两者 `pool_count=32` 且 `pools_len=32`。

2. 区块字段完整性。
```bash
curl -s 'https://explorer.seth.app/api/v2/blocks?type=block&items_count=5' | jq '.items[] | {height,shard,pool_index,local_pool_index}'
```
- 预期：每条都包含 `shard/pool_index/local_pool_index`。

3. 链头一致性。
```bash
curl -s https://explorer.seth.app/api/v2/main-page/blocks | jq '.[0] | {height,timestamp,shard}'
curl -s 'https://explorer.seth.app/api/v2/blocks?type=block&items_count=1' | jq '.items[0] | {height,timestamp,shard}'
curl -s https://explorer.seth.app/api/v2/stats | jq '{total_blocks, shard3: (.seth_shards[] | select(.name=="shard3") | {latest_height,latest_block_timestamp})}'
```
- 预期：`main-page/blocks` 顶高、`/blocks` 顶高、`stats.shard3.latest_height` 差值 `<=2`。

## 5. 错误场景检查（建议）
1. 刷新 `/stats` 3 次。
- 预期：出现“数据展示”或“明确错误+重试”二选一，不出现无限骨架。

2. 访问权限页（无登录凭据）。
- 操作：`/login`、`/auth/profile`、`/account/watchlist`。
- 预期：页面可渲染，不崩溃；表现为登录提示或 guard 行为。

## 6. 自动化复测命令
```bash
yarn qa:prod:api-contract
yarn qa:prod:data-freshness
PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop
```
- 预期：三条命令全部 PASS；`qa:prod:data-freshness` 允许 `root indexed_pools=0` warning，但不允许 error。

## 7. 当前已知放行项
- `root` 分片当前 `indexed_pools=0`、`latest_height=null`。
- 该项已按后端阻塞放行，不影响当前匿名链路可用性；后续由链侧/RPC 继续修复。
