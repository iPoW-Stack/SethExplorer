import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { assertNoRuntimeError, collectApiFailures, gotoWithRetry, summarizeApiFailures, waitForNoPersistentLoading } from './utils';

type RouteEntry = {
  routePattern: string;
  concretePath: string | null;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  requiresAuth?: boolean;
};

interface RouteMatrixPayload {
  entries?: Array<{
    routePattern: string;
    concretePath: string | null;
    priority: RouteEntry['priority'];
    requiresAuth?: boolean;
  }>;
}

const MATRIX_PATH = path.resolve(process.cwd(), 'test-results', 'qa', 'prod-route-matrix.json');
const PRIORITIES = new Set((process.env.PROD_FULLSITE_PRIORITIES || 'P0,P1,P2,P3').split(',').map((item) => item.trim()).filter(Boolean));
const ROUTE_LIMIT = Number(process.env.PROD_FULLSITE_ROUTE_LIMIT || 120);

const fallbackRoutes: Array<RouteEntry> = [
  { routePattern: '/', concretePath: '/', priority: 'P0' },
  { routePattern: '/blocks', concretePath: '/blocks', priority: 'P0' },
  { routePattern: '/txs', concretePath: '/txs', priority: 'P0' },
  { routePattern: '/stats', concretePath: '/stats', priority: 'P1' },
  { routePattern: '/api-docs', concretePath: '/api-docs', priority: 'P1' },
  { routePattern: '/tokens', concretePath: '/tokens', priority: 'P1' },
];

function loadRoutes(): Array<RouteEntry> {
  if (!fs.existsSync(MATRIX_PATH)) {
    return fallbackRoutes;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8')) as RouteMatrixPayload;
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    const picked = entries
      .filter((entry) => Boolean(entry?.concretePath))
      .filter((entry) => PRIORITIES.has(entry.priority))
      .slice(0, ROUTE_LIMIT)
      .map((entry) => ({
        routePattern: entry.routePattern,
        concretePath: entry.concretePath as string,
        priority: entry.priority as RouteEntry['priority'],
        requiresAuth: Boolean(entry.requiresAuth),
      }));

    return picked.length > 0 ? picked : fallbackRoutes;
  } catch {
    return fallbackRoutes;
  }
}

const routes = loadRoutes();

test.describe('Production Fullsite Sweep', () => {
  test.setTimeout(90_000);

  for (const route of routes) {
    test(`[${route.priority}] ${route.concretePath}`, async ({ page }) => {
      if (!route.concretePath) {
        test.skip(true, 'No concrete path');
      }

      const tracker = collectApiFailures(page);
      try {
        const response = await gotoWithRetry(page, route.concretePath!, 2, 45_000);
        const status = response?.status() ?? 0;
        expect(status).toBeGreaterThan(0);
        expect(status).toBeLessThan(500);

        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => null);
        await waitForNoPersistentLoading(page, 25_000).catch(() => null);
        await assertNoRuntimeError(page);

        const body = page.locator('body');
        await expect(body).toBeVisible();

        const html = await page.content();
        expect(html).not.toMatch(/Application error|Runtime capture blocked|Failed to load static file|ChunkLoadError/i);

        const severeFailures = tracker
          .getFailures()
          .filter((item) => item.kind === 'request' || (item.status ?? 0) >= 500);

        expect(
          severeFailures,
          severeFailures.length === 0 ? '' : `API failures\n${summarizeApiFailures(severeFailures)}`,
        ).toEqual([]);
      } finally {
        tracker.dispose();
      }
    });
  }
});
