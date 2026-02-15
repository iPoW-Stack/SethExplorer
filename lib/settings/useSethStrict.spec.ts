import { describe, expect, test, vi } from 'vitest';

type MockConfig = {
  UI: {
    colorTheme: {
      default?: {
        id: string;
      };
    };
    strict: {
      mode: boolean;
      dataSource: 'stub' | 'live';
    };
  };
};

async function loadModule(config: MockConfig) {
  vi.resetModules();
  vi.doMock('configs/app', () => ({ default: config }));
  return import('./useSethStrict');
}

describe('useSethStrict', () => {
  test('returns true for seth theme with strict mode enabled', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { default: { id: 'seth' } },
        strict: { mode: true, dataSource: 'stub' },
      },
    });

    expect(mod.isSethTheme()).toBe(true);
    expect(mod.isSethStrict()).toBe(true);
    expect(mod.default()).toBe(true);
    expect(mod.getSethStrictDataSource()).toBe('stub');
  });

  test('returns false when strict mode is disabled', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { default: { id: 'seth' } },
        strict: { mode: false, dataSource: 'live' },
      },
    });

    expect(mod.isSethTheme()).toBe(true);
    expect(mod.isSethStrict()).toBe(false);
    expect(mod.default()).toBe(false);
    expect(mod.getSethStrictDataSource()).toBe('live');
  });

  test('returns false for non-seth themes', async() => {
    const mod = await loadModule({
      UI: {
        colorTheme: { default: { id: 'dark' } },
        strict: { mode: true, dataSource: 'stub' },
      },
    });

    expect(mod.isSethTheme()).toBe(false);
    expect(mod.isSethStrict()).toBe(false);
    expect(mod.default()).toBe(false);
  });
});
