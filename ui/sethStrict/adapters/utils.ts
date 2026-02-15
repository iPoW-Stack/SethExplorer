import BigNumber from 'bignumber.js';

import dayjs from 'lib/date/dayjs';
import shortenString from 'lib/shortenString';
import { WEI } from 'ui/shared/value/utils';

const numberFormatter = new Intl.NumberFormat('en-US');
const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function formatAge(timestamp?: string | null, fallback = '-') {
  if (!timestamp) {
    return fallback;
  }

  const value = dayjs(timestamp);
  if (!value.isValid()) {
    return fallback;
  }

  return value.fromNow();
}

export function formatDateTime(timestamp?: string | null, fallback = '-') {
  if (!timestamp) {
    return fallback;
  }

  const value = dayjs(timestamp);
  if (!value.isValid()) {
    return fallback;
  }

  return value.format('MMM-DD-YYYY hh:mm:ss A [UTC]');
}

export function shortHash(value?: string | null, fallback = '-') {
  if (!value) {
    return fallback;
  }
  return shortenString(value);
}

export function formatInteger(value?: number | string | null, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) {
    return fallback;
  }

  return numberFormatter.format(num);
}

export function formatCompactInteger(value?: number | string | null, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) {
    return fallback;
  }

  return compactNumberFormatter.format(num);
}

export function formatUsd(value?: string | number | null, fallback = '-') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) {
    return fallback;
  }

  return usdFormatter.format(num);
}

export function formatWeiToEth(value?: string | null, fallback = '-') {
  if (!value) {
    return fallback;
  }

  try {
    const ethValue = new BigNumber(value).div(WEI);
    if (!ethValue.isFinite()) {
      return fallback;
    }

    if (ethValue.isGreaterThan(0) && ethValue.isLessThan(0.0001)) {
      return '<0.0001 ETH';
    }

    return `${ ethValue.dp(4).toFormat() } ETH`;
  } catch {
    return fallback;
  }
}

export function calcPercent(numerator?: string | number | null, denominator?: string | number | null): number {
  const num = numerator === null || numerator === undefined ? NaN : Number(numerator);
  const den = denominator === null || denominator === undefined ? NaN : Number(denominator);

  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
    return 0;
  }

  const ratio = Math.round((num / den) * 100);
  return Math.max(0, Math.min(ratio, 100));
}

export function getErrorMessage(error: unknown, fallback = 'Failed to load data') {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as { status?: number; statusText?: string; message?: string };
    if (err.status) {
      return `${ err.status } ${ err.statusText || '' }`.trim();
    }
    if (err.message) {
      return err.message;
    }
  }

  return fallback;
}

export function gasColorByPercent(percent: number) {
  if (percent >= 80) {
    return '#f97316';
  }
  if (percent >= 50) {
    return '#eab308';
  }
  if (percent >= 25) {
    return '#22c55e';
  }
  return '#00ffb8';
}

