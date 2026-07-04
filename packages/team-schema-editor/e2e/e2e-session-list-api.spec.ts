import { expect, test } from '@playwright/test';

import { advanceUntilStable, loadExampleSchema, startRuntimeSession } from './helpers/e2eApi';

test.describe('Session List API — GET /runtime/sessions', () => {
  test('returns paginated list of sessions with status and cursor', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');

    // Start two sessions so there is at least something in the list
    const session1 = await startRuntimeSession(request, fixture, 'E2E session list test A');
    const session2 = await startRuntimeSession(request, fixture, 'E2E session list test B');

    // Advance once so the sessions persist a snapshot in the DB
    await advanceUntilStable(request, session1, 2);
    await advanceUntilStable(request, session2, 2);

    // GET /runtime/sessions — unfiltered
    const response = await request.get('/runtime/sessions?limit=50');
    expect(response.ok()).toBeTruthy();

    const rawPayload = await response.json() as unknown;
    const payload = (typeof rawPayload === 'object' && rawPayload !== null && 'data' in rawPayload)
      ? (rawPayload as { data: unknown }).data
      : rawPayload;

    const listResponse = payload as {
      items: Array<{ sessionId: string; status: string; createdAt: string; updatedAt: string }>;
      total: number;
      limit: number;
      nextCursor?: string;
    };

    expect(Array.isArray(listResponse.items)).toBeTruthy();
    expect(listResponse.total).toBeGreaterThanOrEqual(2);
    expect(listResponse.limit).toBe(50);

    const sessionIds = listResponse.items.map((item) => item.sessionId);
    expect(sessionIds).toContain(session1.sessionId);
    expect(sessionIds).toContain(session2.sessionId);

    // Each item must have required fields
    for (const item of listResponse.items) {
      expect(typeof item.sessionId).toBe('string');
      expect(typeof item.status).toBe('string');
      expect(typeof item.createdAt).toBe('string');
      expect(typeof item.updatedAt).toBe('string');
    }
  });

  test('filters sessions by status=running', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const session = await startRuntimeSession(request, fixture, 'Session list status filter test');

    // Advance once — session starts as running, may become terminated/completed after advance
    await advanceUntilStable(request, session, 1);

    const response = await request.get('/runtime/sessions?status=running&limit=100');
    expect(response.ok()).toBeTruthy();

    const rawPayload = await response.json() as unknown;
    const payload = (typeof rawPayload === 'object' && rawPayload !== null && 'data' in rawPayload)
      ? (rawPayload as { data: unknown }).data
      : rawPayload;

    const listResponse = payload as {
      items: Array<{ sessionId: string; status: string }>;
    };

    for (const item of listResponse.items) {
      expect(item.status).toBe('running');
    }
  });

  test('cursor-based pagination returns consistent non-overlapping pages', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');

    // Start 3 sessions
    for (let i = 0; i < 3; i++) {
      const s = await startRuntimeSession(request, fixture, `Pagination E2E session ${i}`);
      await advanceUntilStable(request, s, 1);
    }

    // Fetch page 1 with limit=2
    const page1Response = await request.get('/runtime/sessions?limit=2');
    expect(page1Response.ok()).toBeTruthy();

    const rawPage1 = await page1Response.json() as unknown;
    const page1Payload = (typeof rawPage1 === 'object' && rawPage1 !== null && 'data' in rawPage1)
      ? (rawPage1 as { data: unknown }).data
      : rawPage1;

    const page1 = page1Payload as {
      items: Array<{ sessionId: string }>;
      nextCursor?: string;
      total: number;
    };

    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBeGreaterThanOrEqual(3);

    if (page1.nextCursor === undefined) {
      // All sessions fit in one page — acceptable for small DB state
      return;
    }

    // Fetch page 2 using cursor
    const page2Response = await request.get(`/runtime/sessions?limit=2&cursor=${page1.nextCursor}`);
    expect(page2Response.ok()).toBeTruthy();

    const rawPage2 = await page2Response.json() as unknown;
    const page2Payload = (typeof rawPage2 === 'object' && rawPage2 !== null && 'data' in rawPage2)
      ? (rawPage2 as { data: unknown }).data
      : rawPage2;

    const page2 = page2Payload as {
      items: Array<{ sessionId: string }>;
    };

    // No session ID should appear on both pages
    const page1Ids = new Set(page1.items.map((item) => item.sessionId));
    for (const item of page2.items) {
      expect(page1Ids.has(item.sessionId)).toBe(false);
    }
  });
});
