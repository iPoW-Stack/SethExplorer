# Seth Explorer 生产手动验收手册（2026-03-02）

## 0. 验收环境
- 域名：`https://explorer.seth.app`
- 终端：Desktop Chrome + Mobile 模拟（DevTools）

## 1. 全站可访问性
1. 打开以下页面并确认首屏可渲染：
- `/`
- `/blocks`
- `/txs`
- `/stats`
- `/api-docs`
- `/tokens`
- `/verified-contracts`
- `/internal-txs`
- `/token-transfers`

2. 预期结果
- HTTP 200
- 无白屏、无长期无限 skeleton
- 无明显布局错位/横向溢出

## 2. 数据一致性与实时性
1. 对比高度口径
- `GET /api/v2/main-page/blocks` 取首条 `height`
- `GET /api/v2/blocks?type=block&items_count=1` 取 `items[0].height`
- `GET /api/v2/stats` 取 `seth_shards[shard3].latest_height`
- `GET /api/v2/seth/live-head` 取 `global_head.height`

2. 预期结果
- 四处高度通常差值 `<=2`
- 若链侧调试暂停，可能短时不增长；但四处高度应一致且状态可观测

3. 交易-区块口径抽查
- 打开 `/txs` 任取交易进入详情，记录 `block_number`
- 打开 `/blocks/<block_number>` 校验高度一致

## 3. 功能闭环
1. 搜索
- 顶部搜索输入：区块高度、交易哈希、地址哈希
- 预期：落地到正确详情页或结果页，页面不报错

2. 列表交互
- `/blocks`、`/txs`、`/tokens` 测试分页与行跳转
- 预期：分页可用、链接可跳转、返回后可继续浏览

3. 详情交互
- `/block/[id]`：验证 Prev/Next 可用
- `/tx/[hash]`、`/address/[hash]`：验证复制按钮可用

## 4. UI 与品牌
1. favicon 与品牌文案
- 预期：浏览器标签图标为 Seth 图标
- 预期：页面可见区域无 Blockscout 文案残留

2. Stats 页面
- 打开 `/stats`
- 预期：分片状态为业务语义标签（Healthy/Degraded/Unavailable）
- 预期：后端异常时有明确错误态或状态提示，不白屏

## 5. 鉴权边界（无账号）
1. 打开：
- `/login`
- `/auth/profile`
- `/account/api-key`（或其他 account 子页）

2. 预期结果
- guard 行为正常（重定向/提示）
- 页面不崩溃

## 6. 失败判定（任一即不通过）
- 核心页面出现 5xx、白屏、死按钮、死链接、死分页
- 搜索三类输入任一无法落地
- 交易与区块高度主字段口径冲突
- 可见 Blockscout 品牌残留（favicon/文案/图表可见水印）
