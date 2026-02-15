# Seth Strict Functional Report (2026-02-13)

## Objective
- Keep Seth strict visuals stable while closing core anonymous functional paths:
  - `/`
  - `/blocks`
  - `/txs`
  - `/block/[id]`
  - `/tx/[hash]`
  - `/address/[hash]`
- Ensure visible strict controls are actionable and testable.
- Keep FE/BE ownership split explicit when live backend is unstable.

## Implemented Updates
- Added runtime server bootstrap helper:
  - `tools/shared/ensure-runtime-server.mjs`
  - auto-detects unhealthy occupied local port and falls back to free local ports
  - supports strict mode / strict data source env injection for spawned runtime
- Hardened HAR capture:
  - `tools/qa/capture-core-har.mjs`
  - now auto-starts/reuses runtime, captures per-route in isolated pages, retry-enabled navigation
  - writes summary even on startup failure with explicit reason
- Hardened design runtime capture:
  - `tools/design-audit/capture-runtime.mjs`
  - now auto-starts/reuses runtime and captures against effective resolved runtime base URL
- Improved audit report correctness:
  - `tools/design-audit/report.mjs`
  - runtime base now inferred from captured final runtime routes (not hard-coded env fallback)
- Reduced e2e flakiness for strict live:
  - `tests/e2e/core-interactions.spec.ts`
  - switched to strict test ids, raised readiness timeout for home/blocks/tx links
  - `tests/e2e/core-smoke.spec.ts`
  - route-specific retries/timeouts, slow-route handling for detail pages
- Improved e2e webserver stability:
  - `playwright-e2e.config.ts`
  - set `NEXT_DISABLE_WEBPACK_CACHE=1` for Playwright web server startup path

## Validation Results
- `yarn lint:tsc`: PASS
- `yarn test:vitest --run`: PASS (`32` files, `226` tests)
- `npx playwright test -c playwright-ct.config.ts ui/sethStrict/StrictPages.pw.tsx`: PASS (`3` tests)
- `yarn test:e2e:core`: PASS (`9` tests, no flaky retries in latest run)
- `yarn qa:capture:core-har`: PASS
  - artifact:
    - `test-results/core-har/core-2026-02-13T21-42-14-467Z.summary.json`
    - `test-results/core-har/core-2026-02-13T21-42-14-467Z.har`
- `yarn audit:design:strict`: FAIL (expected strict threshold gate)
  - `pass_count = 0/6`
  - all `loading_blocked=false`
  - desktop scores remain below `97`
  - latest report: `docs/ui-audit-seth-strict.md`

## Design Audit Delta (vs previous baseline in handoff doc)
- Compared with `docs/seth-strict-handoff-2026-02-13.md` baseline:
  - home desktop: `95.28 -> 95.26` (`-0.02`)
  - blocks desktop: `96.35 -> 96.36` (`+0.01`)
  - txs desktop: `96.26 -> 96.27` (`+0.01`)
  - block desktop: `96.19 -> 96.05` (`-0.14`)
  - tx desktop: `96.15 -> 96.13` (`-0.02`)
  - address desktop: `95.57 -> 95.65` (`+0.08`)
- Conclusion:
  - No page regressed by more than `0.5` in this round.

## FE/BE Boundary Notes
- FE functional closure for strict shell + core navigation is in place (no dead `#` strict controls in covered paths).
- Live backend instability remains observable (`ETIMEDOUT`/`ECONNRESET` in Next proxy logs during e2e/har runs).
- Ownership and blocker tracking: `docs/seth-strict-fe-be-boundary-2026-02-13.md`.

## Next Step
- Continue visual convergence work for desktop strict pages to lift all six pages from ~`95-96` into `>=97` while keeping current functional and test gates green.
