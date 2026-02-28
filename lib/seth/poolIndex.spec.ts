import { describe, expect, it } from 'vitest';

import { formatSethPoolIndex, formatSethPoolIndexCompact, parseSethPoolIndex } from './poolIndex';

describe('seth pool index formatting', () => {
  it('formats root shard index', () => {
    const meta = parseSethPoolIndex(13);

    expect(meta).toEqual({
      globalPoolIndex: 13,
      shardIndex: 0,
      shardName: 'root',
      shardNetwork: 1,
      localPoolIndex: 13,
      isKnownShard: true,
    });
    expect(formatSethPoolIndexCompact(13)).toBe('root:13');
    expect(formatSethPoolIndex(13)).toBe('root / pool 13');
  });

  it('formats shard3 index', () => {
    const meta = parseSethPoolIndex(45);

    expect(meta?.shardName).toBe('shard3');
    expect(meta?.localPoolIndex).toBe(13);
    expect(formatSethPoolIndexCompact(45)).toBe('shard3:13');
  });

  it('falls back for unknown shard range', () => {
    expect(formatSethPoolIndexCompact(100)).toBe('pool 100');
    expect(formatSethPoolIndex(100)).toBe('pool 100');
  });
});
