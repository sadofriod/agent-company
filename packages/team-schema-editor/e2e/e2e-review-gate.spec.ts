import { expect, test } from '@playwright/test';

import {
  advanceUntilStable,
  createMaxRoundsSchema,
  createOwnerConflictSchema,
  loadExampleSchema,
  startRuntimeSession,
} from './helpers/e2eApi';

test.describe('PRD Aligned E2E - Review Gate and Runtime Governance', () => {
  test('E2E-006 Owner Conflict Block / TEST-005 (discussion conflict prevents ticket admission)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const schema = createOwnerConflictSchema(fixture);
    const started = await startRuntimeSession(request, schema, 'Handle a neutral task with no domain hints');
    const finalSession = await advanceUntilStable(request, started, 6);
    const discussionResult = finalSession.state.discussionResult as {
      conflicts?: unknown[];
      pendingItems?: unknown[];
    } | undefined;

    expect(discussionResult?.conflicts?.length ?? 0).toBeGreaterThan(0);
    expect(discussionResult?.pendingItems?.length ?? 0).toBeGreaterThan(0);
    expect(finalSession.state.pendingTickets?.length ?? 0).toBe(0);

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasConflictEvent = auditTrail.some((event) => event.eventType === 'discussion.conflict_detected');

    expect(hasConflictEvent).toBeTruthy();
  });

  test('E2E-013 Infinite Discussion Loop Stop (max rounds reached)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const schema = createMaxRoundsSchema(fixture);
    const started = await startRuntimeSession(request, schema, 'Neutral scope with forced conflict');
    const finalSession = await advanceUntilStable(request, started, 6);
    const discussionResult = finalSession.state.discussionResult as {
      maxRoundsReached?: boolean;
      conflicts?: unknown[];
    } | undefined;

    expect(discussionResult?.conflicts?.length ?? 0).toBeGreaterThan(0);
    expect(discussionResult?.maxRoundsReached).toBeTruthy();
    expect(finalSession.state.nextAction ?? '').toContain('conflict resolution');
  });

  test('E2E-007 Pipeline Cycle Reject / TEST-003 (cyclic pipeline fixture is rejected before execution)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const schema = createOwnerConflictSchema(fixture);
    const started = await startRuntimeSession(request, schema, 'Trigger a cyclic pipeline fixture', {
      pipelineCycle: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string; suggestedAction?: string } | undefined;

    expect(interruption?.kind).toBe('pipeline_cycle_detected');
    expect(finalSession.state.nextAction ?? '').toContain('return_to_discussion');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasCycleInterruptEvent = auditTrail.some((event) => (
      event.eventType === 'runtime.interrupted'
      && event.metadata?.kind === 'pipeline_cycle_detected'
    ));

    expect(hasCycleInterruptEvent).toBeTruthy();
  });

  test('E2E-008 Capability Missing Interrupt / TEST-004 (unauthorized capability is denied and audited)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const schema = fixture;
    const started = await startRuntimeSession(request, schema, 'Trigger a denied capability load', {
      capabilityMissing: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string; suggestedAction?: string } | undefined;

    expect(interruption?.kind).toBe('reload_capability');
    expect(finalSession.state.nextAction ?? '').toContain('reload_capability');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasCapabilityDeniedEvent = auditTrail.some((event) => (
      event.eventType === 'capability.denied'
      && Array.isArray(event.metadata?.deniedCapabilityIds)
      && (event.metadata.deniedCapabilityIds as unknown[]).length > 0
    ));

    expect(hasCapabilityDeniedEvent).toBeTruthy();
  });

  test('E2E-010 RAG Evidence Required / TEST-006 (missing evidence refs forces revise)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const schema = fixture;
    const started = await startRuntimeSession(request, schema, 'Trigger an evidence-missing review', {
      ragEvidenceMissing: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string; suggestedAction?: string } | undefined;

    expect(interruption?.kind).toBe('revise_upstream');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasReviseEvent = auditTrail.some((event) => (
      event.eventType === 'review.revise_required'
      && event.metadata?.status === 'revise'
    ));

    expect(hasReviseEvent).toBeTruthy();
  });

  test('E2E-005 Handoff Field Missing / TEST-002 (missing required output field in step result forces revise)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const started = await startRuntimeSession(request, fixture, 'Trigger a handoff field missing scenario', {
      handoffFieldMissing: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string } | undefined;

    expect(interruption?.kind).toBe('revise_upstream');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasReviseEvent = auditTrail.some((event) => (
      event.eventType === 'review.revise_required'
      && event.metadata?.status === 'revise'
    ));

    expect(hasReviseEvent).toBeTruthy();
  });

  test('E2E-009 Memory Scope Pollution Prevented (writing to system memory scope is rejected)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const started = await startRuntimeSession(request, fixture, 'Trigger a memory pollution attempt', {
      memoryScopePollution: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string } | undefined;

    expect(interruption?.kind).toBe('return_to_discussion');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasPollutionBlockedEvent = auditTrail.some((event) => (
      event.eventType === 'memory.write_denied'
      && event.reason?.includes('system memory scope')
    ));

    expect(hasPollutionBlockedEvent).toBeTruthy();
  });

  test('E2E-011 Memory Conflict Escalation (conflict triggers review and block/escalate)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const started = await startRuntimeSession(request, fixture, 'Trigger a memory conflict escalation', {
      memoryConflictEscalation: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string } | undefined;

    expect(interruption?.kind).toBe('return_to_discussion');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasConflictEvent = auditTrail.some((event) => (
      event.eventType === 'memory.conflict_detected'
    ));

    expect(hasConflictEvent).toBeTruthy();
  });

  test('E2E-012 Unauthorized Retrieval Denied (unauthorized scope lookup is blocked and audited)', async ({ request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const started = await startRuntimeSession(request, fixture, 'Trigger an unauthorized lookup', {
      unauthorizedRetrieval: true,
    });
    const finalSession = await advanceUntilStable(request, started, 6);
    const interruption = finalSession.state.interruption as { kind?: string } | undefined;

    expect(interruption?.kind).toBe('return_to_discussion');

    const auditTrail = finalSession.state.context?.auditTrail ?? [];
    const hasUnauthorizedAttemptEvent = auditTrail.some((event) => (
      event.eventType === 'memory.retrieval_unauthorized'
      && event.reason?.includes('unauthorized memory scope')
    ));

    expect(hasUnauthorizedAttemptEvent).toBeTruthy();
  });
});
