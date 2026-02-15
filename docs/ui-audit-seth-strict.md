# Seth Strict Design Audit

## 1. Scope
- generated_at: `2026-02-13T22:09:43.825Z`
- design_base: `http://34.126.98.218:8082/`
- runtime_base: `http://localhost:8096`
- thresholds: desktop >= 97, mobile >= 96, loading_blocked=false

## 2. Summary
- strict_result: **FAIL**
- pass_count: `0/6`

## 3. Page Matrix
| Page | Desktop | Mobile | Loading | Result |
|---|---|---|---|---|
| Home `/` | fail | pass | pass | fail |
| Blocks `/blocks` | fail | pass | pass | fail |
| Transactions `/txs` | fail | pass | pass | fail |
| Block `/block/[id]` | fail | pass | pass | fail |
| Tx `/tx/[hash]` | fail | pass | pass | fail |
| Address `/address/[hash]` | fail | pass | pass | fail |

## 4. Metrics
| Page | Desktop Score | Desktop changed_ratio | Mobile Score | Mobile changed_ratio | Final URL |
|---|---:|---:|---:|---:|---|
| home | 95.26 | 8.30% | 97.87 | 3.27% | http://localhost:8096/ |
| blocks | 96.36 | 6.75% | 98.34 | 2.58% | http://localhost:8096/blocks |
| txs | 96.27 | 6.82% | 98.29 | 2.66% | http://localhost:8096/txs |
| block | 96.05 | 6.51% | 97.98 | 3.07% | http://localhost:8096/block/18249102 |
| tx | 96.13 | 6.36% | 98.16 | 2.57% | http://localhost:8096/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6 |
| address | 95.65 | 7.32% | 98.09 | 2.80% | http://localhost:8096/address/0x1234567890abcdef1234567890abcdef12345678 |

## 5. Priority Buckets
### P0
- Home `/`: score below threshold (desktop=95.26, mobile=97.87)
- Blocks `/blocks`: score below threshold (desktop=96.36, mobile=98.34)
- Transactions `/txs`: score below threshold (desktop=96.27, mobile=98.29)
- Block `/block/[id]`: score below threshold (desktop=96.05, mobile=97.98)
- Tx `/tx/[hash]`: score below threshold (desktop=96.13, mobile=98.16)
- Address `/address/[hash]`: score below threshold (desktop=95.65, mobile=98.09)

### P1
- none

### P2
- none

## 6. Runtime Routes
```json
{
  "home": "http://localhost:8096/",
  "blocks": "http://localhost:8096/blocks",
  "txs": "http://localhost:8096/txs",
  "block": "http://localhost:8096/block/18249102",
  "tx": "http://localhost:8096/tx/0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6",
  "address": "http://localhost:8096/address/0x1234567890abcdef1234567890abcdef12345678"
}
```

