# Seth Explorer 生产复检与下一阶段计划（2026-02-27 v3）

## 1. 本次结论（最新）
- 生产站点：`https://explorer.seth.app`
- 当前状态：**已恢复到“链头可推进 + 主页面/列表一致 + 功能可用”**。
- 最新抽检（UTC）：
  - `/api/v2/main-page/blocks` 顶部高度与 `/api/v2/blocks` 顶部高度一致。
  - 链头时间戳滞后 `< 300s`。
  - `qa:prod:data-freshness` 连续多轮 `PASS`（仅保留 `root indexed_pools=0` 警告，按既定策略暂放行）。

## 2. 本轮关键修复

### 2.1 后端 Seth 取块策略修复（生产）
文件：`/home/nickwest2025/explorer/apps/ethereum_jsonrpc/lib/ethereum_jsonrpc/seth/variant.ex`
- 修复 `fetch_block_by_number/2`：
  - 不再固定只用 `local_pool_index=0`。
  - 按当前高度选择可服务的 pool，再请求块。
- 修复 `build_fetch_pairs/3`：
  - 由“同高度多 pool 扫描”收敛为“每分片每高度选 1 个 pool”。
  - 显著减少超时、重复块和错误缺口扩散。
- 新增 `find_pool_for_height/2`：
  - 优先使用 `(height-1) mod pool_count` 对应池。
  - 不可用时再回退到最小可服务池。

### 2.2 chain-shim 稳定性修复（生产）
文件：`/opt/seth-chain-shim/chain_shim.py`
- 虚拟高度映射：改为稳定映射（避免无序漂移）。
- `get_latest_pool_info` 候选选择：
  - 从“取最高值”改为“中位带内取新鲜值”，防止单节点离群值污染。
- 保留 `/get_blocks` 的虚拟高度回查，确保可按虚拟高度还原到真实 pool+local height。

### 2.3 配置回滚根因定位并修复（生产）
问题根因：`/etc/default/seth-chain-shim` 被 `mini8` 临时文件策略覆盖，导致 shim 回滚到旧 8 节点配置。
- 已统一写入并锁定：
  - `/etc/default/seth-chain-shim`
  - `/tmp/seth-chain-shim.mini8.env`
- 已设置 immutable：`chattr +i /etc/default/seth-chain-shim`
- 当前运行进程确认：`REAL_SETH_ENDPOINTS`=80，`CHAIN_SHIM_POOL_INFO_PROBE_MAX`=24。

### 2.4 脏数据清理（生产 DB）
数据库：`postgresql://postgres@localhost:5899/blockscout`
- 对旧错误映射产生的异常高块做了降级/清理：
  - `consensus=true` 但时间戳明显陈旧的高位块改为 `consensus=false`。
  - 删除 `number > max(consensus=true)` 的非共识噪音块。
- 清理后结果：`max(number)=max(consensus=true)`，避免列表被错误高位污染。

## 3. 验证结果（本轮）

### 3.1 生产数据门禁
- `node tools/qa/prod-api-contract.mjs`：`PASS`
- `node tools/qa/prod-data-freshness.mjs`：连续多轮 `PASS`

### 3.2 功能门禁
- `E2E_BASE_URL=https://explorer.seth.app yarn test:e2e:core:live`：`14 passed`
- 核心匿名链路（首页/列表/详情/搜索/分页/跳转）通过。

## 4. 仍需技术确认的唯一口径问题
当前浏览器链头采用“虚拟高度映射”后，显示高度约 `8x,xxx`。你之前口径是“应在 3 万+”。
- 这不是“是否更新”的问题（当前已实时更新，且 freshness 通过），而是**全局高度定义口径**问题。
- 现有 Seth RPC 仅直接给出 `pool_index + local height`，不直接给“全局唯一高度定义”。

需要技术总监确认以下之一（给出明确规则）：
1. 全局高度 = 哪个公式（例如 round-robin、累计、或官方指定公式）。
2. 或提供“官方全局高度接口/字段”（优先）。

在未拿到口径前，系统可稳定运行，但“显示高度数值是否完全符合技术总监口径”无法做最终签字。

## 5. 下一阶段计划（功能稳定后）
1. 先锁定高度口径（P0）。
2. 按确认口径固化 `chain_shim` 映射实现，并清一次历史脏块。
3. 再跑 3 轮生产门禁：
   - `qa:prod:api-contract`
   - `qa:prod:data-freshness`
   - `PROD_E2E_ROUNDS=3 qa:prod:e2e:loop`
4. 功能完全稳定后，再继续 Seth Strict 6/6 视觉收敛。
