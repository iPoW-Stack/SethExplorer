export interface FontFamily {
  name: string;
  url: string;
}

export type SethStrictDataSource = 'stub' | 'live';

export interface UIStrictLiveHeadConfig {
  enabled: boolean;
  pollMs: number;
  switchBlocks: number;
  switchSeconds: number;
  apiPath: string;
}

export interface UIStrictConfig {
  mode: boolean;
  dataSource: SethStrictDataSource;
  liveHead: UIStrictLiveHeadConfig;
}
