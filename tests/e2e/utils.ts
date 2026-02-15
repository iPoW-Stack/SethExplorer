import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const SAMPLE_BLOCK = '18249102';
export const SAMPLE_TX_HASH = '0x39a1c4b2e5d8f9a0c1b3d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6';
export const SAMPLE_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
export const SAMPLE_TOKEN = '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238';

export interface ApiFailure {
  kind: 'response' | 'request';
  url: string;
  status?: number;
  method?: string;
  errorText?: string;
}

const pageInitApplied = new WeakSet<Page>();

async function applyStrictLiveOverrides(page: Page) {
  if (pageInitApplied.has(page)) {
    return;
  }

  await page.addInitScript(() => {
    const overrides = {
      NEXT_PUBLIC_SETH_STRICT_MODE: 'true',
      NEXT_PUBLIC_SETH_STRICT_DATA_SOURCE: 'live',
    };
    const nextWindow = window as Window & { __envs?: Record<string, string> };

    let envStore = {
      ...(nextWindow.__envs || {}),
      ...overrides,
    };

    Object.defineProperty(nextWindow, '__envs', {
      configurable: true,
      get() {
        return envStore;
      },
      set(value: unknown) {
        const nextValue = typeof value === 'object' && value !== null ? value as Record<string, string> : {};
        envStore = {
          ...nextValue,
          ...overrides,
        };
      },
    });

    nextWindow.__envs = envStore;
  });
  pageInitApplied.add(page);
}

function isApiRequest(url: string) {
  return /\/api\//.test(url);
}

export function collectApiFailures(page: Page) {
  const failures: Array<ApiFailure> = [];

  const onResponse = (response: Awaited<ReturnType<Page['waitForResponse']>>) => {
    const url = response.url();
    if (!isApiRequest(url)) {
      return;
    }
    if (response.status() >= 500) {
      failures.push({
        kind: 'response',
        url,
        status: response.status(),
        method: response.request().method(),
      });
    }
  };

  const onRequestFailed = (request: Awaited<ReturnType<Page['waitForRequest']>>) => {
    const url = request.url();
    if (!isApiRequest(url)) {
      return;
    }
    failures.push({
      kind: 'request',
      url,
      method: request.method(),
      errorText: request.failure()?.errorText,
    });
  };

  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);

  return {
    getFailures: () => failures.slice(),
    dispose: () => {
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
    },
  };
}

export async function gotoWithRetry(page: Page, path: string, retries = 2, timeoutMs = 30_000) {
  await applyStrictLiveOverrides(page);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await page.goto(path, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    } catch (error) {
      lastError = error;
      if (attempt < retries && !page.isClosed()) {
        await page.waitForTimeout(1_000);
      }
    }
  }

  throw lastError ?? new Error(`Failed to open ${ path }`);
}

export async function waitForNoPersistentLoading(page: Page, timeoutMs = 25_000) {
  const loadingText = page.getByText(/Loading data, please wait/i).first();

  if (await loadingText.count() === 0) {
    return;
  }

  await expect(loadingText).toBeHidden({ timeout: timeoutMs });
}

export async function assertNoRuntimeError(page: Page) {
  await expect(page.getByText(/Runtime capture blocked/i)).toHaveCount(0);
  await expect(page.getByText(/Resource load error/i)).toHaveCount(0);
  await expect(page.getByText(/Application error/i)).toHaveCount(0);
}

export async function assertClickable(locator: Locator, timeoutMs = 20_000) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  await expect(locator).toBeEnabled({ timeout: timeoutMs });
}

export function summarizeApiFailures(failures: Array<ApiFailure>) {
  return failures.map((failure) => {
    if (failure.kind === 'response') {
      return `${ failure.method || 'GET' } ${ failure.status } ${ failure.url }`;
    }
    return `${ failure.method || 'GET' } requestfailed ${ failure.url } ${ failure.errorText || '' }`;
  }).join('\n');
}

export async function expectErrorOrContent(page: Page) {
  const errorSignals = [
    page.getByText(/Failed to load/i).first(),
    page.getByText(/Unable to load/i).first(),
    page.getByText(/Data fetch error/i).first(),
    page.getByText(/Runtime capture blocked/i).first(),
  ];

  for (const signal of errorSignals) {
    if (await signal.count() > 0 && await signal.isVisible().catch(() => false)) {
      return;
    }
  }

  await assertNoRuntimeError(page);
}
