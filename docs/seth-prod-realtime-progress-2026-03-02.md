# Seth Explorer 生产实时修复进度（2026-03-02）
## 当前结论
- 生产域名 `https://explorer.seth.app` 已恢复到可用状态，核心接口可持续返回 `200`。
- 区块高度已从历史停滞值（`32363`）切换到当前测试网实时高度，并持续增长。
- 全站门禁已完成连续 3 轮通过（含路由矩阵、全站扫页、实时性、branding、生产 e2e）。

## 本次关键修复
1. 修复生产 RPC 可达性链路（P0）。
- 问题：`34.16.27.175` 到 80 台节点 `IP:23001~23080` 出站长期 `ECONNREFUSED`，导致 shim 无法直连。
- 处理：新增系统级 SSH 隧道服务组，将节点本地 RPC 转发到浏览器服务器本地端口。
- 新服务：
  - `seth-rpc-tunnel-1.service`: `127.0.0.1:33001 -> 35.197.170.240:2221 -> 127.0.0.1:23001`
  - `seth-rpc-tunnel-2.service`: `127.0.0.1:33002 -> 34.40.205.68:2221 -> 127.0.0.1:23002`
  - `seth-rpc-tunnel-3.service`: `127.0.0.1:33003 -> 34.84.82.48:2221 -> 127.0.0.1:23003`
  - 进程由 systemd `Restart=always` 托管，开机自启。

2. 修复 chain-shim 上游配置（P0）。
- 文件：`/etc/default/seth-chain-shim`
- 生效配置：
  - `REAL_SETH_ENDPOINTS=http://127.0.0.1:33001,http://127.0.0.1:33002,http://127.0.0.1:33003`
  - `CHAIN_SHIM_POOL_INFO_PROBE_MAX=3`
  - `CHAIN_SHIM_QUERY_ACCOUNT_PROBE_MAX=3`
- 重启：`systemctl restart seth-chain-shim`

3. 后端重建与重索引（P0）。
- 执行脚本：`/tmp/reset_backend3.sh`
- 动作：
  - 停止 `blockscout-backend`
  - 终止 DB 占用连接
  - `mix ecto.drop/create/migrate`
  - `pm2 restart blockscout-backend --update-env`
- 结果：索引高度按新链头重新推进，不再卡在旧高度。

## 实测状态（UTC 2026-03-02 10:20 附近）
- `/api/v2/main-page/blocks` 顶部：`height=123`（随后继续增长）
- `/api/v2/stats`：`total_blocks=123`，`shard3.latest_height=123`
- `/api/v2/seth/live-head`：`global_head=125`，`lag.blocks=2`，`lag.seconds=9`
- `root` 分片仍为 `unavailable/indexed_pools=0`（按约定作为显式告警，不伪装正常）

## 门禁结果
- 3 轮全站门禁通过：
  - 产物：`qa-artifacts/prod-fullsite-loop/2026-03-02T10-14-53-010Z/summary.json`
- 每轮通过项：
  - `qa:prod:runtime-config`
  - `qa:prod:api-contract`
  - `qa:prod:route-matrix`
  - `qa:prod:site-sweep`
  - `qa:prod:data-freshness`
  - `qa:prod:branding`
  - `test:e2e:prod-fullsite`（desktop + mobile）

## 风险与边界
- 现状已从“单隧道”提升到“3 隧道”；可用性明显提升，但仍建议扩到 5 条做更强容灾。
- `/api/v1/lines`、`/api/v1/counters` 仍返回 `400(module/action required)`；当前前端已走 v2 fallback，不阻塞主链路。
