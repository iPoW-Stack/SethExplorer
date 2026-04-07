# Seth Strict Recovery Checklist

This checklist is the English-only recovery reference for the Seth strict UI audit flow.

## Baseline
- Design baseline: `http://34.126.98.218:8082/`
- Runtime baseline: `RUNTIME_BASE_URL` (default `http://localhost:8080`)
- Current strict target: `6/6`
- Recovery rule: verify screenshot sources first, then close UI gaps route by route.

## Route Checklist
### Home `/`
- Keep the shell layout aligned with the design baseline.
- Keep four stats cards in the title area.
- Keep the two-column latest blocks plus latest transactions layout.
- Hide hero, highlights, chain indicators, and ad modules in strict mode.

### Blocks `/blocks`
- Keep heading, spacing, and pagination aligned.
- Keep table order, header height, row height, and gas bar styling aligned.
- Show only the primary table view in strict mode.

### Transactions `/txs`
- Keep header actions and search density aligned.
- Align method badges, address truncation, and fee/value emphasis.
- Hide advanced filters and extended tabs in strict mode.

### Block `/block/[id]`
- Align the title row, mined-by metadata, and timestamp order.
- Keep the Overview field order aligned.
- Audit only the Overview surface in the strict first-screen flow.

### Tx `/tx/[hash]`
- Align title and subtitle density.
- Keep Status, Block, From, To, Value, and Fee ordering aligned.
- Treat Logs, State, and Trace as secondary surfaces in strict mode.

### Address `/address/[hash]`
- Align title, copy actions, and tag density.
- Keep the Balance card, Token Holdings card, and Transactions table on the first screen.
- Hide clusters, widgets, MUD modules, and other non-baseline surfaces.

## Intermediate Gates
1. After shell alignment: `home/blocks/txs` desktop score `>=95`.
2. After list-page alignment: desktop and mobile targets for `home/blocks/txs` pass.
3. After detail-page alignment: `passCount=6/6`.
