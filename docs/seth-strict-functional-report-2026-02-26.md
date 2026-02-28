# Seth Strict 功能全量回归报告（2026-02-26）

## 1. 测试目标
验证生产站点 `https://explorer.seth.app` 在 Seth strict + live 下：
- 匿名高频链路可用
- 可见交互无死按钮/死链接/死分页
- 后端失败场景有明确错误态与重试
- UI 基础可用性不破版

## 2. 本轮关键修复前提
- 生产 `envs.js` 已改为 strict live。
- XHS level 占位默认值已移除（改为 null）。

## 3. 自动化结果
### 3.1 核心链路
- 命令：`yarn test:e2e:core:live`（`E2E_BASE_URL=https://explorer.seth.app`）
- 结果：14/14 通过

### 3.2 全量公开链路
- 命令：`yarn test:e2e:full:live`（`E2E_BASE_URL=https://explorer.seth.app`）
- 结果：通过
- 备注：`token list has actionable token links` 出现 1 次 flaky，自动重试通过。

### 3.3 单元/适配器回归
- 命令：`yarn test:vitest --run`
- 结果：226/226 通过

## 4. 覆盖说明
- 路由覆盖：P0/P1 公共路由 + auth guard + desktop/mobile UI sanity。
- 交互覆盖：导航、搜索、分页、详情链接、复制、错误态。

## 5. 发现的问题与归因
### 5.1 FE 已修复
- strict 生产环境误回落 stub（通过 envs.js 修复）。
- XHS level 前端静态占位误导（placeholder 改为 null）。

### 5.2 BE 待处理
- `/api/v2/main-page/blocks` 与 `/api/v2/stats` 统计口径不一致。
- 后端日志报错：`seth_pool_index/0 undefined` 与 pool info 超时。

## 6. 结论
- 前端当前版本满足“功能可交付”标准。
- 剩余风险集中在后端索引/接口一致性，不属于前端可单独闭环范围。
