# Seth Explorer 继续执行现场记录（2026-02-28）

## 1. 当前现场概览
- 生产站：`https://explorer.seth.app`
- Backend：`34.16.27.175`（PM2: `blockscout-backend`, `blockscout-frontend`）
- Chain-shim：`34.82.205.176`（systemd: `seth-chain-shim`）

## 2. 已完成清单
1. 后端缺失区间方向修复（防反向 range）。
2. `GET /api/v2/stats` 增加 `source_state/last_synced_at/error_code`。
3. DB 清理：
- 删除反向 `missing_block_ranges`。
- 删除超出共识高度的历史非共识噪音块。
4. chain-shim 加入 endpoint 健康评分、熔断、启动配置一致性校验。
5. chain-shim 监控 timer（每分钟）已启用。
6. 功能门禁通过：
- `qa:functional:full` PASS
- `qa:prod:full` PASS（3 轮）

## 3. 未完成/待下一阶段
1. UI 严格审计 `6/6` 未达成。
- 最新：`docs/ui-audit-seth-strict.md`
- 现状：desktop 全页约 `94.68 ~ 96.00`，未达 `>=97.0`。

2. 后端噪音日志专项未完成。
- `coin_balance_catchup :empty_response`
- `empty_blocks_to_refetch` 间歇失败

## 4. 最新关键证据路径
- 功能总报告：`docs/seth-prod-functional-report-2026-02-28.md`
- 后端交接：`docs/seth-prod-backend-handoff-2026-02-28.md`
- 手测指南：`docs/seth-prod-manual-test-guide-2026-02-28.md`
- 生产快照：`qa-artifacts/prod-checks/freeze-2026-02-27T22-28-41Z`
- 最新生产门禁：`qa-artifacts/prod-e2e-loop/2026-02-27T22-50-30-647Z/summary.json`

## 5. 下次启动后直接执行顺序
1. 先跑数据与功能健康检查：
- `yarn qa:prod:api-contract`
- `yarn qa:prod:data-freshness`
- `PROD_E2E_ROUNDS=1 yarn qa:prod:e2e:loop`

2. 开始 UI 严格收敛（固定顺序）：
- Home -> Blocks -> Txs -> Block -> Tx -> Address
- 每页改完立即跑：`RUNTIME_BASE_URL=https://explorer.seth.app yarn audit:design:strict`

3. 最终收口：
- `yarn qa:prod:full`
- `RUNTIME_BASE_URL=https://explorer.seth.app yarn audit:design:strict`

## 6. 关键运维命令（续跑必备）
### 6.1 Backend
- `sudo -u nickwest2025 env PATH=/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:$PATH /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 list`
- `sudo -u nickwest2025 env PATH=/opt/elixir/bin:/home/nickwest2025/.nvm/versions/node/v25.6.0/bin:/usr/local/bin:/usr/bin:/bin /home/nickwest2025/.nvm/versions/node/v25.6.0/bin/pm2 restart blockscout-backend --update-env`

### 6.2 Chain-shim
- `sudo systemctl restart seth-chain-shim`
- `sudo systemctl --no-pager --full status seth-chain-shim`
- `sudo systemctl --no-pager --full status seth-chain-shim-monitor.timer`

## 7. 当前默认结论
- 功能与数据：已可交付。
- UI 严格对齐：仍需后续专项收敛到 `6/6`。
