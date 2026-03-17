# Seth Explorer 续跑现场记录（2026-03-01）

## 1. 当前状态快照
- 生产域：`https://explorer.seth.app`
- 已完成：
  - 交易分页口径修复已上线（全局块高分页）。
  - Branding 清理已上线（favicon + charts 水印）。
  - 生产 e2e 3 轮门禁通过（见 `qa-artifacts/prod-e2e-loop/2026-03-01T13-24-27-954Z/summary.json`）。
- 当前阻塞：
  - `qa:prod:data-freshness` 失败（链头时间戳滞后）。
  - 根因是生产机到 Seth RPC 节点网络不可用（拒绝/超时）。

## 2. 本次关键证据
- 通过：
  - `qa:prod:api-contract` PASS（最新：`2026-03-01T14-20-59-666Z`）
  - `qa:prod:branding` PASS
  - `qa:prod:e2e:loop` 3 轮 PASS
- 失败：
  - `qa:prod:data-freshness` FAIL（最新：`freshness-2026-03-01T14-21-42-336Z.json`）

## 3. 续跑优先级（重启后直接执行）
1. 先验证 RPC 出站连通：
```bash
ssh -i gcp_key deploy@34.16.27.175
python3 - <<'PY'
import requests
for ip,port in [('34.147.156.178',23053),('34.152.22.138',23031),('35.197.170.240',23001)]:
  u=f'http://{ip}:{port}/get_latest_pool_info'
  try:
    r=requests.post(u,data={'network':'3'},timeout=8)
    print(u, r.status_code)
  except Exception as e:
    print(u, 'ERR', e)
PY
```

2. 连通恢复后，立即执行：
```bash
cd d:/Dapp/explorer-fe
yarn qa:prod:data-freshness
yarn qa:prod:realtime-health
PROD_E2E_ROUNDS=3 yarn qa:prod:e2e:loop
```

3. 若仍失败：
- 向技术总监索要“生产机可达的统一 RPC 网关地址（非 80 节点直连）”。
- 锁定后再做后端环境变量切换并重启。

## 4. 必知注意事项
- 不要再把交易主字段回退为本地池高度。
- `local_block_number` 仅用于次级展示/诊断。
- 当前阻塞不在前端交互层，属于后端 RPC 网络可达性问题。
