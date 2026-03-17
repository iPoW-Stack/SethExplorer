import { describe, expect, test } from 'vitest';

import { getLiveHeadDecision } from './liveHeadDecision';

describe('getLiveHeadDecision', () => {
  test('returns live when lag exceeds threshold', () => {
    const decision = getLiveHeadDecision({
      liveHead: {
        generated_at: '2026-02-28T00:00:00.000Z',
        source_state: 'ok',
        global_head: { height: 32010, timestamp: '2026-02-28T00:00:00.000Z' },
        indexer_head: { height: 32000, timestamp: '2026-02-27T23:58:00.000Z' },
        lag: { blocks: 10, seconds: 180 },
        shards: [],
      },
      indexerHeight: 32000,
      switchBlocks: 3,
      switchSeconds: 90,
    });

    expect(decision.status).toBe('live');
    expect(decision.shouldUseLiveHead).toBe(true);
    expect(decision.headHeight).toBe(32010);
  });

  test('returns live when rpc head is ahead even within threshold', () => {
    const decision = getLiveHeadDecision({
      liveHead: {
        generated_at: '2026-02-28T00:00:00.000Z',
        source_state: 'ok',
        global_head: { height: 32002, timestamp: '2026-02-28T00:00:00.000Z' },
        indexer_head: { height: 32001, timestamp: '2026-02-28T00:00:00.000Z' },
        lag: { blocks: 1, seconds: 20 },
        shards: [],
      },
      indexerHeight: 32001,
      switchBlocks: 3,
      switchSeconds: 90,
    });

    expect(decision.status).toBe('live');
    expect(decision.shouldUseLiveHead).toBe(true);
  });

  test('returns indexed when rpc head matches indexer within threshold', () => {
    const decision = getLiveHeadDecision({
      liveHead: {
        generated_at: '2026-02-28T00:00:00.000Z',
        source_state: 'ok',
        global_head: { height: 32002, timestamp: '2026-02-28T00:00:00.000Z' },
        indexer_head: { height: 32002, timestamp: '2026-02-28T00:00:00.000Z' },
        lag: { blocks: 0, seconds: 20 },
        shards: [],
      },
      indexerHeight: 32002,
      switchBlocks: 3,
      switchSeconds: 90,
    });

    expect(decision.status).toBe('indexed');
    expect(decision.shouldUseLiveHead).toBe(false);
  });

  test('returns lagging when source is degraded', () => {
    const decision = getLiveHeadDecision({
      liveHead: {
        generated_at: '2026-02-28T00:00:00.000Z',
        source_state: 'degraded',
        global_head: { height: 32002, timestamp: '2026-02-28T00:00:00.000Z' },
        indexer_head: { height: 32002, timestamp: '2026-02-28T00:00:00.000Z' },
        lag: { blocks: 0, seconds: 0 },
        shards: [],
      },
      indexerHeight: 32002,
      switchBlocks: 3,
      switchSeconds: 90,
    });

    expect(decision.status).toBe('lagging');
    expect(decision.shouldUseLiveHead).toBe(false);
  });

  test('returns stalled when live head is unavailable', () => {
    const decision = getLiveHeadDecision({
      liveHead: null,
      indexerHeight: 32000,
      switchBlocks: 3,
      switchSeconds: 90,
    });

    expect(decision.status).toBe('stalled');
    expect(decision.shouldUseLiveHead).toBe(false);
  });
});
