import { describe, expect, test, vi } from 'vitest';

type MockConfig = {
  UI: {
    colorTheme: {
      'default'?: {
        id: string;
      };
    };
    strict: {
      mode: boolean;
      dataSource: 'stub' | 'live';
      liveHead: {
        enabled: boolean;
        pollMs: number;
        switchBlocks: number;
        switchSeconds: number;
        apiPath: string;
      };
    };
  };
};

async function loadModule(config: MockConfig) {
  vi.resetModules();
  vi.doMock('configs/app', () => ({ 'default': config }));
  return import('./useSethStrict');
}

describe('useSethStrict', () => {
  test('returns true for seth theme with strict mode enabled', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { 'default': { id: 'seth' } },
        strict: {
          mode: true,
          dataSource: 'stub',
          liveHead: {
            enabled: true,
            pollMs: 10_000,
            switchBlocks: 3,
            switchSeconds: 90,
            apiPath: '/api/v2/seth/live-head',
          },
        },
      },
    });

    expect(mod.isSethTheme()).toBe(true);
    expect(mod.isSethStrict()).toBe(true);
    expect(mod.default()).toBe(true);
    expect(mod.getSethStrictDataSource()).toBe('stub');
    expect(mod.isSethLiveHeadEnabled()).toBe(false);
    expect(mod.getSethLiveHeadPollMs()).toBe(10_000);
    expect(mod.getSethLiveHeadSwitchBlocks()).toBe(3);
    expect(mod.getSethLiveHeadSwitchSeconds()).toBe(90);
    expect(mod.getSethLiveHeadApiPath()).toBe('/api/v2/seth/live-head');
    expect(mod.isStatsServiceEnabled()).toBe(false);
  });

  test('returns false when strict mode is disabled', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { 'default': { id: 'seth' } },
        strict: {
          mode: false,
          dataSource: 'live',
          liveHead: {
            enabled: true,
            pollMs: 10_000,
            switchBlocks: 3,
            switchSeconds: 90,
            apiPath: '/api/v2/seth/live-head',
          },
        },
      },
    });

    expect(mod.isSethTheme()).toBe(true);
    expect(mod.isSethStrict()).toBe(false);
    expect(mod.default()).toBe(false);
    expect(mod.getSethStrictDataSource()).toBe('live');
    expect(mod.isSethLiveHeadEnabled()).toBe(false);
    expect(mod.isStatsServiceEnabled()).toBe(true);
  });

  test('returns false for non-seth themes', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { 'default': { id: 'dark' } },
        strict: {
          mode: true,
          dataSource: 'stub',
          liveHead: {
            enabled: true,
            pollMs: 10_000,
            switchBlocks: 3,
            switchSeconds: 90,
            apiPath: '/api/v2/seth/live-head',
          },
        },
      },
    });

    expect(mod.isSethTheme()).toBe(false);
    expect(mod.isSethStrict()).toBe(false);
    expect(mod.default()).toBe(false);
    expect(mod.isSethLiveHeadEnabled()).toBe(false);
    expect(mod.isStatsServiceEnabled()).toBe(true);
  });
});
