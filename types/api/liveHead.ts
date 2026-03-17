export type SethLiveHeadSourceState = 'ok' | 'degraded' | 'down' | 'timeout' | 'unavailable';

export interface SethBlockNumberResponse {
  jsonrpc?: string;
  id?: number | string;
  result?: string | number | null;
  status?: string;
  message?: string;
}

export interface SethLiveHeadPoint {
  height: number | null;
  timestamp: string | null;
  source?: string | null;
}

export interface SethLiveHeadLag {
  blocks: number | null;
  seconds: number | null;
}

export interface SethLiveHeadShard {
  name: string;
  network: number;
  pool_count: number;
  indexed_pools: number;
  latest_height: number | null;
  latest_block_timestamp: string | null;
  source_state?: SethLiveHeadSourceState;
  error_code?: string | null;
}

export interface SethLiveHeadResponse {
  generated_at: string;
  source_state: SethLiveHeadSourceState;
  global_head: SethLiveHeadPoint;
  indexer_head: SethLiveHeadPoint;
  lag: SethLiveHeadLag;
  shards: Array<SethLiveHeadShard>;
}
