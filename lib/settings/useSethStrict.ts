import config from 'configs/app';

import type { SethStrictDataSource } from 'types/ui';

export function isSethTheme() {
  return config.UI.colorTheme.default?.id === 'seth';
}

export function isSethStrict() {
  return isSethTheme() && config.UI.strict.mode;
}

export function getSethStrictDataSource(): SethStrictDataSource {
  return config.UI.strict.dataSource;
}

export default function useSethStrict() {
  return isSethStrict();
}
