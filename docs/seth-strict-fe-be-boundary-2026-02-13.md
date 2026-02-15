# Seth Strict FE/BE Boundary (2026-02-13)

## Scope
- Anonymous high-frequency paths only:
  - `/`
  - `/blocks`
  - `/txs`
  - `/block/[id]`
  - `/tx/[hash]`
  - `/address/[hash]`
- Runtime mode for functional checks: `NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE=live`

## Ownership Rules
- FE owns:
  - API success (`2xx`) but wrong UI behavior
  - broken routing/wiring, dead controls, pagination state errors
  - missing or misleading loading/error/retry UX
- BE owns:
  - upstream timeout/reset (`ETIMEDOUT`, `ECONNRESET`)
  - upstream `5xx`/contract regressions with valid FE request
- Config/Env owns:
  - wrong target host/proxy/network from env mismatch

## Defect Record Fields
- `route`
- `action`
- `endpoint`
- `response/error`
- `owner`
- `next action`

## Current Items
| route | action | endpoint | response/error | owner | next action |
|---|---|---|---|---|---|
| strict shell | click visible controls | n/a | previously had static/placeholder controls in strict shell | FE done | kept in e2e/ct coverage |
| `/`, `/blocks`, `/txs`, `/block/[id]`, `/tx/[hash]`, `/address/[hash]` | load + interact during live tests | `/api/v2/*` via sepolia backend proxy | intermittent `ETIMEDOUT` / `ECONNRESET` observed in Next runtime logs during e2e + HAR capture | BE | stabilize upstream gateway / timeout policy |
| `/address/[hash]` | runtime navigation in HAR capture | page navigation to strict address detail | occasional `page.goto` timeout under live backend pressure (resolved by longer timeout + retries; still BE sensitive) | shared (FE mitigated, BE root cause) | FE keeps retry/timeout guard; BE improves endpoint latency |
| strict visual gate | `yarn audit:design:strict` | n/a | strict threshold remains `0/6` (desktop below `97`) while `loading_blocked=false` | FE | continue desktop visual convergence per handoff priority |

## Evidence
- Functional report: `docs/seth-strict-functional-report-2026-02-13.md`
- Core HAR artifacts:
  - `test-results/core-har/core-2026-02-13T21-42-14-467Z.summary.json`
  - `test-results/core-har/core-2026-02-13T21-42-14-467Z.har`
- Design audit report:
  - `docs/ui-audit-seth-strict.md`
