# Seth Strict Design Audit

## 1. Scope
- generated_at: `2026-02-27T22:48:01.402Z`
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
| Address `/address/[hash]` | fail | pass | pass | fail |

## 4. Metrics
| Page | Desktop Score | Desktop changed_ratio | Mobile Score | Mobile changed_ratio | Final URL |
|---|---:|---:|---:|---:|---|
| home | 94.99 | 8.11% | 97.74 | 3.31% | https://explorer.seth.app/ |
| blocks | 96 | 6.78% | 96.96 | 4.74% | https://explorer.seth.app/blocks |
| txs | 95.37 | 8.09% | 96.15 | 7.02% | https://explorer.seth.app/txs |
| block | 95.93 | 6.43% | 97.9 | 3.05% | https://explorer.seth.app/block/32213 |
| tx | 95.6 | 6.85% | 98 | 2.78% | https://explorer.seth.app/tx/0x00000000000000000000000000000000000000000000000000007dd500000000 |
| address | 94.68 | 8.61% | 96.02 | 6.68% | https://explorer.seth.app/address/0xf0d8b50b0C0b6B976b65b1CBAb6FF20E0A0C8401 |

## 5. Priority Buckets
### P0
- Home `/`: score below threshold (desktop=94.99, mobile=97.74)
- Blocks `/blocks`: score below threshold (desktop=96, mobile=96.96)
- Transactions `/txs`: score below threshold (desktop=95.37, mobile=96.15)
- Block `/block/[id]`: score below threshold (desktop=95.93, mobile=97.9)
- Tx `/tx/[hash]`: score below threshold (desktop=95.6, mobile=98)
- Address `/address/[hash]`: score below threshold (desktop=94.68, mobile=96.02)

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
  "block": "https://explorer.seth.app/block/32213",
  "tx": "https://explorer.seth.app/tx/0x00000000000000000000000000000000000000000000000000007dd500000000",
  "address": "https://explorer.seth.app/address/0xf0d8b50b0C0b6B976b65b1CBAb6FF20E0A0C8401"
}
```

