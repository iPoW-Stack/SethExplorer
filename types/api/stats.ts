import type { SethLiveHeadSourceState } from './liveHead';

export type HomeStats = {
  total_blocks: string;
  total_addresses: string;
  total_transactions: string;
  average_block_time: number;
  coin_image?: string | null;
  coin_price: string | null;
  coin_price_change_percentage: number | null; // e.g -6.22
  total_gas_used: string;
  transactions_today: string | null;
  gas_used_today: string;
  gas_prices: GasPrices | null;
  gas_price_updated_at: string | null;
  gas_prices_update_in: number;
  static_gas_price: string | null;
  market_cap: string | null;
  network_utilization_percentage: number;
  tvl: string | null;
  rootstock_locked_btc?: string | null;
  last_output_root_size?: string | null;
  secondary_coin_price?: string | null;
  secondary_coin_image?: string | null;
  celo?: {
    epoch_number: number;
  };
  index_state?: 'ok' | 'lagging' | 'stalled';
  index_lag_blocks?: number | null;
  index_lag_seconds?: number | null;
  seth_shards?: Array<{
    name: string;
    network: number;
    pool_count: number;
    indexed_pools: number;
    latest_height: number | null;
    latest_block_timestamp: string | null;
    source_state?: SethLiveHeadSourceState;
    error_code?: string | null;
    last_synced_at?: string | null;
    pools?: Array<{
      local_pool_index: number;
      global_pool_index: number;
      indexed: boolean;
      latest_height: number | null;
      latest_block_timestamp: string | null;
    }>;
  }>;
};

export type GasPrices = {
  average: GasPriceInfo | null;
  fast: GasPriceInfo | null;
  slow: GasPriceInfo | null;
};

export interface GasPriceInfo {
  fiat_price: string | null;
  price: number | null;
  time: number | null;
  base_fee: number | null;
  priority_fee: number | null;
}
