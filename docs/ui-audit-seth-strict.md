# Seth Strict Design Audit

## 1. Scope
- generated_at: `2026-03-02T05:40:13.771Z`
- design_base: `http://34.126.98.218:8082/`
- runtime_base: `https://explorer.seth.app`
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
| Address `/address/[hash]` | fail | fail | pass | fail |

## 4. Metrics
| Page | Desktop Score | Desktop changed_ratio | Mobile Score | Mobile changed_ratio | Final URL |
|---|---:|---:|---:|---:|---|
| home | 93.99 | 8.79% | 97.16 | 3.78% | https://explorer.seth.app/ |
| blocks | 95.4 | 7.25% | 97.57 | 3.27% | https://explorer.seth.app/blocks |
| txs | 95.64 | 7.42% | 98.07 | 2.90% | https://explorer.seth.app/txs |
| block | 95.28 | 6.80% | 97.55 | 3.16% | https://explorer.seth.app/block/7 |
| tx | 95.12 | 6.94% | 97.84 | 2.85% | https://explorer.seth.app/tx/0x0e7e6d88dae3d8732f161aa1e3bdb5a88ed1e00de0c880a321b2791af24dad31 |
| address | 93.72 | 8.67% | 95.62 | 6.49% | https://explorer.seth.app/address/0x2E94577A7ed00a4dE26fa04fD85b278290C15B4D |

## 5. Priority Buckets
### P0
- Home `/`: score below threshold (desktop=93.99, mobile=97.16)
- Blocks `/blocks`: score below threshold (desktop=95.4, mobile=97.57)
- Transactions `/txs`: score below threshold (desktop=95.64, mobile=98.07)
- Block `/block/[id]`: score below threshold (desktop=95.28, mobile=97.55)
- Tx `/tx/[hash]`: score below threshold (desktop=95.12, mobile=97.84)
- Address `/address/[hash]`: score below threshold (desktop=93.72, mobile=95.62)

### P1
- none

### P2
- none

## 6. Runtime Routes
```json
{
  "home": "https://explorer.seth.app/",
  "blocks": "https://explorer.seth.app/blocks",
  "txs": "https://explorer.seth.app/txs",
  "block": "https://explorer.seth.app/block/7",
  "tx": "https://explorer.seth.app/tx/0x0e7e6d88dae3d8732f161aa1e3bdb5a88ed1e00de0c880a321b2791af24dad31",
  "address": "https://explorer.seth.app/address/0x2E94577A7ed00a4dE26fa04fD85b278290C15B4D"
}
```

