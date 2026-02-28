# Seth Explorer 后端对接与阻塞清单（2026-02-28）

## 1. 交接目标
给后端负责人快速对齐：
- 本轮已经改了哪些后端与运行逻辑。
- 线上当前接口行为与约束。
- 仍需后端持续处理的项。

## 2. 已落地后端改动

### 2.1 Stats API 扩展
- 接口：`GET /api/v2/stats`
- 改动文件：
  - `/home/nickwest2025/explorer/apps/block_scout_web/lib/block_scout_web/controllers/api/v2/stats_controller.ex`
- `seth_shards` 每项新增：
  - `source_state`
  - `last_synced_at`
  - `error_code`
- 分片合同固定：
  - 必含 `root` + `shard3`
  - 每分片 `pool_count=32`
  - 每分片 `pools.length=32`

### 2.2 缺失区间生成修复
- 文件：`/home/nickwest2025/explorer/apps/indexer/lib/indexer/block/catchup/missing_ranges_collector.ex`
- 修复点：
  - 由 `from..to` 改为 `to..from`
- 影响：避免再写入反向缺失区间（`from_number > to_number`）。

### 2.3 DB 清理动作（已执行）
1. 删除反向缺失区间：
- `delete from missing_block_ranges where from_number > to_number;`

2. 删除高位非共识噪音块（超过最大共识高度）：
- `delete from blocks where consensus=false and number > (select max(number) from blocks where consensus=true);`

## 3. 已落地 chain-shim 运行改动

### 3.1 文件与服务
- 文件：`/opt/seth-chain-shim/chain_shim.py`
- 服务：`seth-chain-shim.service`

### 3.2 本轮改动
1. endpoint 健康评分 + 熔断降权。
2. 全 endpoint 熔断时 fail-open 兜底探测。
3. 启动配置一致性校验（默认强制）。
- 对比：`/etc/default/seth-chain-shim` vs `/tmp/seth-chain-shim.mini8.env`。
- 不一致拒绝启动。

### 3.3 监控定时任务
- 脚本：`/opt/seth-chain-shim/monitor_shim_health.py`
- systemd：
  - `/etc/systemd/system/seth-chain-shim-monitor.service`
  - `/etc/systemd/system/seth-chain-shim-monitor.timer`
- 频率：每分钟。
- 告警条件：5 分钟窗口失败率 > 5%。

## 4. 当前接口状态（实测）

### 4.1 `/api/v2/stats` 关键字段
- `seth_shards[0].name=root`
- `seth_shards[1].name=shard3`
- `pool_count=32`
- `pools.length=32`
- `root.source_state=unavailable`
- `shard3.source_state=ok`

### 4.2 链头一致性
- `main-page/blocks` 顶高与 `stats.shard3.latest_height` 一致。
- freshness 门禁通过（`<=300s`）。

## 5. 后端仍需持续处理（阻塞/风险）
1. `root indexed_pools=0`。
- 当前已显式标记 `source_state=unavailable`。
- 业务影响：root 分片暂无可索引数据。

2. 索引噪音日志。
- `coin_balance_catchup :empty_response`
- `empty_blocks_to_refetch` 间歇失败
- 当前未阻断匿名核心功能，但建议排查上游 RPC 稳定性与重试策略。

## 6. 运维命令（生产）

### 6.1 Backend
- 查看进程：
`sudo -u nickwest2025 env PATH=/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:$PATH /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 list`
- 重启 backend：
`sudo -u nickwest2025 env PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 restart blockscout-backend --update-env`

### 6.2 Chain-shim
- 重启：
`sudo systemctl restart seth-chain-shim`
- 状态：
`sudo systemctl --no-pager --full status seth-chain-shim`
- 监控 timer 状态：
`sudo systemctl --no-pager --full status seth-chain-shim-monitor.timer`

## 7. 建议后续动作（后端）
1. 给 `source_state` 补更细粒度原因码映射（timeout/rpc_unreachable/parse_error）。
2. 针对 `coin_balance_catchup` 和 `empty_blocks_to_refetch` 建立独立失败重试上限和降噪日志。
3. 对 root 分片建立“可用性恢复”专项（先恢复 indexed_pools>0，再取消放行策略）。
