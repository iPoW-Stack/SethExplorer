import type { PaginationParams } from 'ui/shared/pagination/types';

import type { IconName } from 'ui/shared/IconSvg';

export type StrictDataMode = 'stub' | 'live';

export interface StrictDataState {
  mode: StrictDataMode;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

export type StrictRealtimeStatus = 'live' | 'indexed' | 'lagging' | 'stalled';

export interface StrictRealtimeState {
  status: StrictRealtimeStatus;
  source: 'live-head' | 'stats-fallback' | 'block-number-fallback' | 'none';
  label: string;
  headHeight: number | null;
  lagBlocks: number | null;
  lagSeconds: number | null;
  sourceState: string | null;
  shouldUseLiveHead: boolean;
}

export interface StrictHomeStatCard {
  label: string;
  value: string;
  subtext: string;
  icon: IconName;
  iconColor: string;
}

export interface StrictHomeBlockRow {
  id: string;
  block: string;
  blockHref: string;
  poolLabel?: string;
  age: string;
  miner: string;
  minerHref?: string;
  txns: string;
}

export interface StrictHomeTxRow {
  id: string;
  hash: string;
  txHref: string;
  age: string;
  from: string;
  fromHref?: string;
  to: string;
  toHref?: string;
  value: string;
  icon?: string;
}

export interface StrictBlocksRow {
  id: string;
  block: string;
  blockHref: string;
  poolLabel?: string;
  age: string;
  txns: string;
  miner: string;
  minerHref?: string;
  gasUsed: string;
  gasProgress: number;
  gasColor: string;
  reward: string;
}

export interface StrictTxsRow {
  id: string;
  hash: string;
  hashFull?: string;
  status: 'ok' | 'error' | 'pending';
  txHref: string;
  method: string;
  methodTone: 'green' | 'blue' | 'purple' | 'gold' | 'gray';
  block: string;
  blockHref?: string;
  age: string;
  from: string;
  fromHref?: string;
  to: string;
  toHref?: string;
  value: string;
}

export interface StrictPaginationData {
  pageLabel: string;
  pageSizeLabel: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface StrictPageAdapterResult<T> extends StrictDataState {
  rows: Array<T>;
  totalLabel?: string;
  realtime?: StrictRealtimeState;
  pagination?: StrictPaginationData;
  refetch?: () => void;
}

export interface StrictBlockOverviewRow {
  label: string;
  value: string;
  accent?: boolean;
  href?: string;
  copyValue?: string;
}

export interface StrictBlockGasRow {
  label: string;
  value: string;
  accent?: string;
}

export interface StrictTxOverviewRow {
  label: string;
  value: string;
  isStatus?: boolean;
  isChip?: boolean;
  suffix?: string;
  href?: string;
  copyValue?: string;
}

export interface StrictTxGasRow {
  label: string;
  value: string;
}

export interface StrictAddressTxRow {
  id: string;
  hash: string;
  txHref: string;
  method: string;
  block: string;
  blockHref?: string;
  age: string;
  from: string;
  fromHref?: string;
  to: string;
  toHref?: string;
  value: string;
  fee: string;
  fromYou?: boolean;
  toYou?: boolean;
}

export interface StrictPagedQueryData<T> {
  rows: Array<T>;
  pagination: PaginationParams;
}
