export const HOME_STATS = [
  {
    label: 'SETH Price',
    value: '$1,842.23',
    subtext: '@ 0.058 BTC',
    icon: 'tokens' as const,
    iconColor: '#10b981',
  },
  {
    label: 'Market Cap',
    value: '$234.5 M',
    subtext: '+12% (24h)',
    icon: 'globe' as const,
    iconColor: '#10b981',
  },
  {
    label: 'Transactions',
    value: '142.5 M',
    subtext: '+12.4 TPS',
    icon: 'transactions' as const,
    iconColor: '#f59e0b',
  },
  {
    label: 'Latest Block',
    value: '#18,249,102',
    subtext: '3.2s avg time',
    icon: 'block' as const,
    iconColor: '#a855f7',
  },
];

export const HOME_BLOCKS = [
  { block: '18249102', age: '12 secs ago', miner: '0x82...9a12', txns: '142 txns' },
  { block: '18249101', age: '24 secs ago', miner: 'Force Mining', txns: '98 txns' },
  { block: '18249100', age: '36 secs ago', miner: '0x3a...b24c', txns: '215 txns' },
  { block: '18249099', age: '48 secs ago', miner: 'Coinbase', txns: '189 txns' },
];

export const HOME_TXS = [
  { hash: '0x39a1...c4b2', age: '2 secs ago', from: '0x12..9a', to: '0x4b..8c', value: '0.5 ETH', icon: 'file' },
  { hash: '0x8b2c...a91d', age: '5 secs ago', from: '0x99..1f', to: 'Uniswap V3', value: '120.4 USDC', icon: 'swap' },
  { hash: '0x1d4a...e2f9', age: '8 secs ago', from: '0x5c..2e', to: '0x8a..3b', value: '0.00 ETH', icon: 'layers' },
  { hash: '0x7c3e...f1b4', age: '12 secs ago', from: '0x2d..8a', to: 'Opensea', value: '0.02 ETH', icon: 'file' },
];

export const BLOCKS_TABLE_ROWS = [
  {
    block: '18249102',
    age: '12 secs ago',
    txns: '142',
    miner: '0x82...9a12',
    gasUsed: '12.5M (45%)',
    reward: '0.045 ETH',
    gasProgress: 45,
    gasColor: '#00ffb8',
  },
  {
    block: '18249101',
    age: '24 secs ago',
    txns: '98',
    miner: 'Force Mining',
    gasUsed: '8.2M (25%)',
    reward: '0.038 ETH',
    gasProgress: 25,
    gasColor: '#22c55e',
  },
  {
    block: '18249100',
    age: '36 secs ago',
    txns: '215',
    miner: '0x3a...b24c',
    gasUsed: '28.9M (89%)',
    reward: '0.092 ETH',
    gasProgress: 89,
    gasColor: '#eab308',
  },
  {
    block: '18249099',
    age: '48 secs ago',
    txns: '189',
    miner: 'Coinbase',
    gasUsed: '19.5M (70%)',
    reward: '0.071 ETH',
    gasProgress: 70,
    gasColor: '#f97316',
  },
  {
    block: '18249098',
    age: '1 min ago',
    txns: '54',
    miner: '0x99...2k19',
    gasUsed: '4.5M (15%)',
    reward: '0.012 ETH',
    gasProgress: 15,
    gasColor: '#00ffb8',
  },
];

export const TXS_TABLE_ROWS = [
  {
    hash: '0x39a1...c4b2',
    method: 'Transfer',
    methodTone: 'gray',
    block: '18249102',
    age: '2 secs ago',
    from: '0x12..9a',
    to: '0x4b..8c',
    value: '0.5 ETH',
  },
  {
    hash: '0x8b2c...a91d',
    method: 'Execute',
    methodTone: 'green',
    block: '18249102',
    age: '5 secs ago',
    from: '0x99..1f',
    to: 'Uniswap V3',
    value: '120.4 USDC',
  },
  {
    hash: '0x1d4a...e2f9',
    method: 'Mint',
    methodTone: 'green',
    block: '18249101',
    age: '8 secs ago',
    from: '0x5c..2e',
    to: 'Seth NFT',
    value: '0.00 ETH',
  },
  {
    hash: '0x7c3e...f1b4',
    method: 'Approval',
    methodTone: 'gray',
    block: '18249101',
    age: '12 secs ago',
    from: '0x2d..8a',
    to: 'USDT',
    value: '0.00 ETH',
  },
  {
    hash: '0xa9b1...d2c5',
    method: 'Transfer',
    methodTone: 'gray',
    block: '18249100',
    age: '15 secs ago',
    from: '0x1a...2b',
    to: '0x3c...4d',
    value: '2.5 ETH',
  },
];

export const BLOCK_OVERVIEW_ROWS = [
  { label: 'Block Height', value: '18249102' },
  { label: 'Timestamp', value: '12 secs ago (Aug-24-2024 04:32:11 PM +UTC)' },
  { label: 'Transactions', value: '142 transactions and 28 internal transactions in this block', accent: true },
  { label: 'Fee Recipient', value: '0x82...9a12 (Lido: Execution Layer Rewards Vault)' },
  { label: 'Block Reward', value: '0.045092 ETH ($82.41)' },
  { label: 'Total Difficulty', value: '58,750,003,716,598,352,816,469' },
  { label: 'Size', value: '54,231 bytes' },
];

export const BLOCK_GAS_ROWS = [
  { label: 'Gas Used', value: '12,500,000 (45%)', accent: '+0.2s Target' },
  { label: 'Gas Limit', value: '30,000,000' },
  { label: 'Base Fee Per Gas', value: '14.5 Gwei ($0.00045)' },
  { label: 'Burnt Fees', value: '0.281 ETH ($514.21)' },
];

export const TX_OVERVIEW_ROWS = [
  { label: 'Transaction Hash', value: '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6' },
  { label: 'Status', value: 'Success', isStatus: true },
  { label: 'Block', value: '18249102', suffix: '10 Block Confirmations' },
  { label: 'Timestamp', value: '12 secs ago (Aug-24-2024 04:32:11 PM +UTC)' },
  { label: 'From', value: '0x1234...5678' },
  { label: 'To', value: '0xABCD...EF01' },
  { label: 'Value', value: '0.5 ETH ($921.11)', isChip: true },
  { label: 'Transaction Fee', value: '0.00042 ETH ($0.77)' },
];

export const ADDRESS_TX_ROWS = [
  {
    hash: '0x39a1...c4b2',
    method: 'Transfer',
    block: '18249102',
    age: '2 mins ago',
    from: '0x12..9a',
    to: '0x4b..8c',
    value: '0.5 ETH',
    fee: '0.00042',
    fromYou: true,
  },
  {
    hash: '0x8b2c...a91d',
    method: 'Self',
    block: '18249010',
    age: '1 hr ago',
    from: '0x99..1f',
    to: '0x12..9a',
    value: '10.0 ETH',
    fee: '0.00021',
    toYou: true,
  },
];
