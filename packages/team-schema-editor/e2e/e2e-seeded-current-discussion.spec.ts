import { expect, test } from '@playwright/test';

import {
  advanceUntilStable,
  getSchemaByKey,
  startRuntimeSession,
} from './helpers/e2eApi';

type JsonRecord = Record<string, unknown>;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const bindAgentsToDeterministicFallback = (fixture: JsonRecord): void => {
  const agents = Array.isArray(fixture.agents) ? fixture.agents as Array<JsonRecord> : [];

  for (const agent of agents) {
    const metadata = typeof agent.metadata === 'object' && agent.metadata !== null
      ? agent.metadata as JsonRecord
      : {};

    metadata.llm = {
      provider: 'test-fallback',
      model: 'test-fallback-model',
      api_format: 'custom',
    };
    agent.metadata = metadata;
    agent.model = 'test-fallback-model';
  }
};

test.describe('PRD Aligned E2E - Seeded Current Discussion Blackboard', () => {
  test('current workspace seeds the discussion blackboard topology and routes one ticket per connected owner', async ({ request }) => {
    test.setTimeout(120000);

    const seededSchema = await getSchemaByKey(request, 'current');
    expect(seededSchema.team_name).toBe('Discussion Blackboard Team');

    const layout = typeof seededSchema.layout === 'object' && seededSchema.layout !== null
      ? seededSchema.layout as {
        edges?: Array<{ source?: string; target?: string; data?: { mode?: string } }>;
      }
      : {};
    const discussionEdges = (layout.edges ?? []).filter((edge) => edge.source === 'discussion' || edge.target === 'discussion');
    const discussionTargets = discussionEdges.map((edge) => edge.source === 'discussion' ? edge.target : edge.source);

    expect(discussionTargets).toEqual(expect.arrayContaining([
      'agent:ceo',
      'agent:cto',
      'agent:content_leader',
      'department:strategy',
      'department:engineering',
      'department:content',
    ]));
    expect(discussionEdges.every((edge) => edge.data?.mode === 'discuss')).toBeTruthy();

    const runtimeSchema = deepClone(seededSchema);
    bindAgentsToDeterministicFallback(runtimeSchema);

    const started = await startRuntimeSession(request, runtimeSchema, 'Plan a launch with strategy, engineering, and content tracks');
    const finalSession = await advanceUntilStable(request, started, 16);
    const discussionResult = finalSession.state.discussionResult as {
      turns?: Array<{ agentId?: string }>;
      ticketDrafts?: Array<{
        ownerAgentId?: string;
        outputContract?: string;
      }>;
      connectedTargets?: Array<{ targetId?: string }>;
    } | undefined;
    const turnAgentIds = (discussionResult?.turns ?? []).map((turn) => turn.agentId);
    const ticketDraftOwnerIds = (discussionResult?.ticketDrafts ?? []).map((draft) => draft.ownerAgentId);
    const ticketDraftOutputContracts = (discussionResult?.ticketDrafts ?? []).map((draft) => draft.outputContract);
    const completedTicketOwnerIds = Array.isArray(finalSession.state.completedTickets)
      ? (finalSession.state.completedTickets as Array<{ ownerAgentId?: string }>).map((ticket) => ticket.ownerAgentId)
      : [];
    const completedStepAgentIds = Array.isArray(finalSession.state.completedStepResults)
      ? (finalSession.state.completedStepResults as Array<{ ownerAgentId?: string }>).map((step) => step.ownerAgentId)
      : [];
    const connectedTargetIds = new Set((discussionResult?.connectedTargets ?? []).map((target) => target.targetId));

    expect(turnAgentIds).toEqual(['ceo', 'cto', 'content_leader']);
    expect(ticketDraftOwnerIds).toEqual(['ceo', 'cto', 'content_leader']);
    expect(ticketDraftOutputContracts).toEqual(['strategy_ticket', 'engineering_ticket', 'content_ticket']);
    expect(completedTicketOwnerIds).toEqual(['ceo', 'cto', 'content_leader']);
    expect(completedStepAgentIds).toEqual(['ceo', 'cto', 'content_leader']);
    expect(connectedTargetIds.has('department:strategy')).toBeTruthy();
    expect(connectedTargetIds.has('department:engineering')).toBeTruthy();
    expect(connectedTargetIds.has('department:content')).toBeTruthy();
    expect(finalSession.state.interruption).toBeUndefined();
    expect(finalSession.state.nextAction?.toLowerCase()).toContain('completed');
  });
});