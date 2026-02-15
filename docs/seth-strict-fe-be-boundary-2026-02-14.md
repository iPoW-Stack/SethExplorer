# Seth Strict FE/BE Boundary (2026-02-14)

## 1) 判责规则（本轮沿用）
- FE：请求成功但交互/渲染错误、死按钮/死链接/死分页、错误态缺失。
- BE：上游超时/重置、`5xx`、接口数据契约异常。
- Config/Env：目标 host、代理、环境变量导致的请求目标错误。

## 2) 缺陷与观察台账
| route | action | endpoint | response/error | owner | next action | evidence |
|---|---|---|---|---|---|---|
| `/` | Header 搜索回车提交 | n/a（前端交互链路） | 首次门禁中出现停留首页未跳转 `search-results` 的波动 | FE (已修复) | 已在 `tests/e2e/public-interactions-full.spec.ts` 增加“searching 阶段重提交流程”；已回归通过 | `qa-artifacts/functional-gate-runs/2026-02-14T13-04-28-336Z/summary.json`（失败批次）+ 2026-02-14 后续通过批次 |
| `/blocks` `/txs` `/block/[id]` `/tx/[hash]` | 强制 `500/abort` 注入 | `/node-api/proxy/api/v2/blocks*` `/transactions*` | 可复现失败注入并显示显式错误态/Retry，不再静默 | FE (已修复) | 保持 `error-handling.spec.ts` 作为长期回归门禁 | `tests/e2e/error-handling.spec.ts`；`qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/...` |
| `/address/[hash]` | 后端异常时首屏行为 | `/node-api/proxy/api/v2/addresses/*` 等 | 观察到 API 失败时可进入“可用降级态”（不一定展示显式错误条） | FE+BE (已记录) | FE 保持降级可用；BE 优化地址相关 endpoint 稳定性与时延 | `tests/e2e/error-handling.spec.ts`（address 用例注释） |
| `/account/*`（无凭据） | guard 页面访问 | 依赖页面数据请求 | 曾出现单次超时后 retry 通过（非持续阻塞） | Shared（环境压力） | 继续观察；当前不作为阻塞项 | `qa-artifacts/functional-gate-runs/2026-02-14T13-34-42-322Z/summary.json`（round-2 日志中的 flaky 重试） |
| 全局 shell | 页面加载 | `/node-api/proxy/api/v2/main-page/indexing-status` `/config/backend-version` | 历史上存在间歇 requestfailed（本轮最终门禁可通过） | BE (观察项) | 后端继续监控网关超时/连接重置策略 | `test-results/core-har/core-2026-02-14T14-57-48-613Z.har` |

## 3) 当前阻塞结论
- 当前无“阻塞发布”的未关闭 FE P0/P1 缺陷。
- 当前无“阻塞发布”的持续性 BE 故障条目；保留 `indexing-status/backend-version` 与地址系接口稳定性观察项。
