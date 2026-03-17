# Seth Explorer 后端对接与阻塞台账（2026-03-02）

## 1. 生产基线
- 主机：`34.16.27.175`
- 站点：`https://explorer.seth.app`
- 后端进程：`pm2 blockscout-backend`
- 前端进程：`pm2 blockscout-frontend`
- 分片结构：`root + shard3`，两者 `pool_count=32`、`pools.length=32`

## 2. 已确认正常项
1. API 合同
- `qa:prod:api-contract` 持续 PASS。
- `stats`、`blocks`、`main-page/blocks`、`live-head` 字段结构可用。

2. 路由可用性
- 全站巡检 `qa:prod:site-sweep` PASS（无 5xx）。

3. 分片展示
- `root` 分片不可用状态已显式暴露，不再误导为健康状态。

## 3. 当前后端阻塞/风险
1. 链头节奏存在调试窗口暂停（P0 运行风险）
- 现象：`main-page/blocks` 与 `live-head` 在一段时间内保持同高且时间戳老化。
- 影响：严格 freshness（`live lag <=120s`）偶发失败。
- 归因：链侧调试/出块暂停，不是 FE 交互回归。
- 证据：
  - `qa-artifacts/prod-checks/freshness-2026-03-02T13-32-39-995Z.json`
  - `qa-artifacts/prod-checks/freshness-2026-03-02T13-37-09-251Z.json`

2. `root` 分片无索引（P1）
- 现象：`stats.seth_shards[root].indexed_pools=0`
- 当前处理：前端显式 `Unavailable`，不伪造数据。
- 需要后端继续推进 root 分片索引恢复。

3. stats v1 路由不可用（P2）
- 现象：`/api/v1/lines`、`/api/v1/counters` 非稳定可用。
- 当前处理：前端走 v2/fallback，功能可用但建议后端统一清理 v1 路由语义。

## 4. 本轮后端协作建议（可直接执行）
1. 保持链头可持续推进
- 目标：连续 10 分钟内高度至少推进 5 次。
- 检查命令：
```bash
PROD_BASE_URL=https://explorer.seth.app PROD_REALTIME_WINDOW_SECONDS=600 PROD_REALTIME_INTERVAL_SECONDS=30 PROD_REALTIME_MIN_ADVANCES=5 \
  yarn qa:prod:realtime-health
```

2. 生产门禁切换策略
- 链稳定出块时用严格门禁：
```bash
PROD_BASE_URL=https://explorer.seth.app yarn qa:prod:data-freshness
```
- 链调试暂停时用维护门禁（仅降级时间戳老化）：
```bash
PROD_BASE_URL=https://explorer.seth.app yarn qa:prod:data-freshness:maintenance
```

3. 隧道与 shim 恢复命令
```bash
sudo systemctl restart seth-rpc-tunnel-1
sudo systemctl restart seth-rpc-tunnel-2
sudo systemctl restart seth-rpc-tunnel-3
sudo systemctl restart seth-chain-shim
sudo -u nickwest2025 env PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin \
  /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 restart blockscout-backend --update-env
```

## 5. FE/BE 边界（当前口径）
- FE 已完成：全站可访问、交互闭环、错误态、品牌清理、维护模式门禁。
- BE 待持续推进：链侧出块稳定性、root 分片索引恢复、stats v1 路由统一。
