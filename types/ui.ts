export interface FontFamily {
  name: string;
  url: string;
}

export type SethStrictDataSource = 'stub' | 'live';

export interface UIStrictConfig {
  mode: boolean;
  dataSource: SethStrictDataSource;
}
