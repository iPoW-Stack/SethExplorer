# Seth Explorer 续跑交接（2026-03-02）

## 1. 当前生产状态（已实测）
- 生产域名：`https://explorer.seth.app`
- 前端进程：`pm2 blockscout-frontend` 在线
- 后端进程：`pm2 blockscout-backend` 在线
- 前端已切换到新发布目录：
  - `exec cwd=/home/nickwest2025/releases/explorer-fe-20260302-221047`
- 当前链状态：链头存在阶段性暂停（技术总监调试期间），但前端功能与全站路由可用。

## 2. 本次关键变更
- 已完成 UI 改进项落地并上线（空状态统一、Stats 分片状态语义化、Block 详情 Prev/Next、API Docs 品牌清理、交易列表交互增强）。
- 已上线 Seth favicon 资源链路。
- 已补齐生产巡检脚本能力：
  - `qa:prod:ui-recommendations`
  - `qa:prod:ui-full:3x`
  - `qa:prod:data-freshness:maintenance`
  - `qa:prod:fullsite:3x:maintenance`
- 已修复维护模式判定：
  - 在 `PROD_ALLOW_CHAIN_PAUSE=true` 下，当链头暂停但多源高度一致时，时间戳老化降级为 warning，不再误判为 FE 故障。

## 3. 发布与验证证据
- 前端发布目录：
  - `/home/nickwest2025/releases/explorer-fe-20260302-221047`
- 前端 PM2 切换证据：
  - `pm2 describe blockscout-frontend` 显示 `exec cwd` 已为上述 release 目录
- 严格 UI 全链路 3 轮通过（生产）：
  - `qa-artifacts/prod-ui-full-loop/2026-03-02T13-24-47-201Z/summary.json`
- 全站维护模式 3 轮通过（生产）：
  - `qa-artifacts/prod-fullsite-loop/2026-03-02T14-27-47-698Z/summary.json`

## 4. 续跑命令（本地仓库执行）
```bash
# 严格模式（链头正常持续出块时）
PROD_BASE_URL=https://explorer.seth.app yarn qa:prod:data-freshness
PROD_BASE_URL=https://explorer.seth.app E2E_BASE_URL=https://explorer.seth.app yarn qa:prod:ui-full:3x

# 维护模式（技术总监调试导致链头暂停时）
PROD_BASE_URL=https://explorer.seth.app yarn qa:prod:data-freshness:maintenance
PROD_BASE_URL=https://explorer.seth.app E2E_BASE_URL=https://explorer.seth.app yarn qa:prod:fullsite:3x:maintenance
```

## 5. 自动等待恢复后切回严格门禁
```bash
PROD_BASE_URL=https://explorer.seth.app E2E_BASE_URL=https://explorer.seth.app \
  PROD_RESUME_POLL_MS=60000 PROD_RESUME_TIMEOUT_MS=7200000 PROD_UI_FULL_ROUNDS=3 \
  yarn qa:prod:auto-resume
```

## 6. 紧急恢复命令（生产机）
```bash
sudo systemctl restart seth-rpc-tunnel-1
sudo systemctl restart seth-rpc-tunnel-2
sudo systemctl restart seth-rpc-tunnel-3
sudo systemctl restart seth-chain-shim

sudo -u nickwest2025 env PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin \
  /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 restart blockscout-backend --update-env

sudo -u nickwest2025 env PATH=/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin \
  /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 restart blockscout-frontend --update-env
```

## 7. 未关闭但可追踪项
- `root` 分片 `indexed_pools=0`（已显式状态，不伪装正常）。
- 严格 freshness 可能在链暂停窗口触发失败（非 FE 回归），可用维护模式门禁继续验收功能/UI。
