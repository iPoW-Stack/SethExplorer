import type { SethStrictDataSource } from 'types/ui';

import config from 'configs/app';
import { getEnvValue } from 'configs/app/utils';

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

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

export function isSethLiveHeadEnabled() {
  if (!isSethStrict() || getSethStrictDataSource() !== 'live') {
    return false;
  }

  const value = getEnvValue('NEXT_PUBLIC_LIVE_HEAD_ENABLED');
  if (value === undefined) {
    return config.UI.strict.liveHead.enabled;
  }

  return value !== 'false';
}

export function getSethLiveHeadPollMs() {
  const value = getEnvValue('NEXT_PUBLIC_LIVE_HEAD_POLL_MS');
  return parsePositiveInteger(value, config.UI.strict.liveHead.pollMs);
}

export function getSethLiveHeadSwitchBlocks() {
  const value = getEnvValue('NEXT_PUBLIC_LIVE_HEAD_SWITCH_BLOCKS');
  return parsePositiveInteger(value, config.UI.strict.liveHead.switchBlocks);
}

export function getSethLiveHeadSwitchSeconds() {
  const value = getEnvValue('NEXT_PUBLIC_LIVE_HEAD_SWITCH_SECONDS');
  return parsePositiveInteger(value, config.UI.strict.liveHead.switchSeconds);
}

export function getSethLiveHeadApiPath() {
  const value = getEnvValue('NEXT_PUBLIC_LIVE_HEAD_API_PATH');
  return value || config.UI.strict.liveHead.apiPath;
}

export function isStatsServiceEnabled() {
  const value = getEnvValue('NEXT_PUBLIC_STATS_SERVICE_ENABLED');

  if (value !== undefined) {
    return value !== 'false';
  }

  // Default to v2 fallback unless explicitly enabled by runtime config.
  // This avoids accidental /api/v1 stats-service calls in mixed SSR/runtime setups.
  return false;
}

export default function useSethStrict() {
  return isSethStrict();
}
