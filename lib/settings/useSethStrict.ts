import config from 'configs/app';
import { getEnvValue } from 'configs/app/utils';

import type { SethStrictDataSource } from 'types/ui';

export function isSethTheme() {
  return config.UI.colorTheme.default?.id === 'seth';
}

export function isSethStrict() {
  if (!isSethTheme()) {
    return false;
  }

  const strictModeValue = getEnvValue('NEXT_PUBLIC_SETH_STRICT_MODE');

  if (strictModeValue === undefined) {
    return config.UI.strict.mode;
  }

  return strictModeValue !== 'false';
}

export function getSethStrictDataSource(): SethStrictDataSource {
  const strictDataSourceValue = getEnvValue('NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE');

  if (strictDataSourceValue === 'live') {
    return 'live';
  }

  if (strictDataSourceValue === 'stub') {
    return 'stub';
  }

  return config.UI.strict.dataSource;
}

export default function useSethStrict() {
  return isSethStrict();
}
