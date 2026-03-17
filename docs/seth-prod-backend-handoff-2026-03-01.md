# Seth Explorer 后端交接单（2026-03-01）

## 1. 生产环境
- 域名：`https://explorer.seth.app`
- 服务器：`34.16.27.175`
- 进程：`pm2 blockscout-backend`（id=0）、`pm2 blockscout-frontend`（id=3）

## 2. 本次后端已上线修复

### 2.1 交易分页主键口径修复
文件：
- `/home/nickwest2025/explorer/apps/explorer/lib/explorer/chain/transaction.ex`
- `/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/chain.ex`

修复点：
- `recent_collated_transactions` 从“按 transaction.block_number（本地池高度）分页”改为“按 blocks.number（全局高度）分页”。
- `next_page_params` 对交易页改为输出全局块高。

验收点：
- `/api/v2/transactions?items_count=50` 返回 `next_page_params.block_number` 为全局高度。
- 使用该 `next_page_params` 连续翻页后，`items[].block_number` 保持递减且与详情一致。

## 3. 当前后端阻塞（P0）

### 3.1 RPC 连通性阻塞
现象：
- 从生产机到 Seth 节点 `:23001~:23080` 大范围不可达（拒绝/超时）。
- 导致 `get_latest_pool_info`、`get_blocks` 无法持续获取新数据。

证据：
- `qa:prod:data-freshness` 连续失败（时间戳滞后）。
- backend 日志持续出现：`fetch_blocks_sharded ... pairs=0`、`collected blocks=0`。

影响：
- 链头新鲜度无法维持在门禁阈值内。
- 实时更新不可保证。

## 4. 建议后端优先处理顺序
1. 先恢复 RPC 网络可用性：
   - 确保 `34.16.27.175` 出站可达 Seth 节点端口，或提供单一稳定网关。
2. 恢复后立即复跑：
   - `yarn qa:prod:data-freshness`
   - `yarn qa:prod:realtime-health`
3. 若仍存在口径争议：
   - 提供官方全局高度定义（公式或接口），前后端统一以该定义渲染。

## 5. 快速核对命令
```bash
# 进程
sudo -u nickwest2025 pm2 status

# 关键 API
curl -sS https://explorer.seth.app/api/v2/transactions?items_count=5
curl -sS https://explorer.seth.app/api/v2/seth/live-head
curl -sS https://explorer.seth.app/api/v2/main-page/blocks

# 生产门禁
cd /home/nickwest2025/explorer-fe
yarn qa:prod:api-contract
yarn qa:prod:data-freshness
```

## 6. 当前可交付状态说明
- 功能可用性：可交付（核心链路可用，e2e 3 轮通过）。
- 实时新鲜度：受后端 RPC 网络阻塞，不可签署最终“实时严格正确”。
