import { expect, test } from '@playwright/test';

import {
  advanceUntilStable,
  buildWorkspaceKey,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  startRuntimeSession,
  upsertSchema,
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

const createLayoutDrivenRuntimeSchema = (fixture: JsonRecord): JsonRecord => {
  const schema = deepClone(fixture);

  schema.team_id = 'e2e-layout-runtime';
  schema.team_name = 'E2E Layout Runtime';
  schema.discussion_policy = {
    ...(typeof schema.discussion_policy === 'object' && schema.discussion_policy !== null
      ? schema.discussion_policy as JsonRecord
      : {}),
    mode: 'sequential_handoff',
    max_rounds: 2,
    conflict_resolution: 'supervisor_decision',
    required_outputs: ['topic', 'decision', 'ticket_draft'],
    supervisor_agent_id: 'product_owner',
  };
  schema.layout = {
    nodes: [
      {
        id: 'discussion',
        type: 'workflow',
        position: { x: 760, y: 120 },
        data: {
          kind: 'discussion',
          nodeName: 'Discussion',
          accent: 'var(--discussion-accent)',
        },
      },
      {
        id: 'department:engineering',
        type: 'workflow',
        position: { x: 980, y: 20 },
        data: {
          kind: 'department',
          nodeName: 'Engineering',
          accent: 'var(--department-accent)',
        },
      },
      {
        id: 'workflow-pipeline:1',
        type: 'workflow',
        position: { x: 980, y: 120 },
        data: {
          kind: 'pipeline',
          nodeName: 'Delivery Pipeline',
          accent: 'var(--pipeline-accent)',
          workflowNodeType: 'pipeline',
        },
      },
      {
        id: 'workflow-agent:1',
        type: 'workflow',
        position: { x: 1240, y: 60 },
        data: {
          kind: 'agent',
          nodeName: 'Tech Lead Flow',
          accent: 'var(--agent-accent)',
          workflowNodeType: 'agent',
          workflowAgentId: 'tech_lead',
          workflowMetadata: {
            name: 'Tech Lead Flow',
            description: 'Lead the delivery pipeline.',
          },
        },
      },
      {
        id: 'workflow-agent:2',
        type: 'workflow',
        position: { x: 1240, y: 200 },
        data: {
          kind: 'agent',
          nodeName: 'Executor Flow',
          accent: 'var(--agent-accent)',
          workflowNodeType: 'agent',
          workflowAgentId: 'executor',
          workflowMetadata: {
            name: 'Executor Flow',
            description: 'Execute the downstream pipeline step.',
          },
        },
      },
    ],
    edges: [
      {
        id: 'workflow-link:0',
        source: 'discussion',
        target: 'department:engineering',
        type: 'discuss-broadcast',
        animated: true,
        data: { mode: 'discuss_broadcast' },
      },
      {
        id: 'workflow-link:1',
        source: 'discussion',
        target: 'workflow-agent:1',
        type: 'discuss-broadcast',
        animated: true,
        data: { mode: 'discuss_broadcast' },
      },
      {
        id: 'workflow-link:2',
        source: 'discussion',
        target: 'workflow-agent:2',
        type: 'discuss-broadcast',
        animated: true,
        data: { mode: 'discuss_broadcast' },
      },
      {
        id: 'workflow-link:3',
        source: 'discussion',
        target: 'workflow-pipeline:1',
        type: 'discuss-broadcast',
        animated: true,
        data: { mode: 'discuss_broadcast' },
      },
      {
        id: 'workflow-link:4',
        source: 'workflow-pipeline:1',
        target: 'workflow-agent:1',
        type: 'pipeline-handoff',
        data: { mode: 'pipeline' },
      },
      {
        id: 'workflow-link:5',
        source: 'workflow-agent:1',
        target: 'workflow-agent:2',
        type: 'pipeline-handoff',
        data: { mode: 'pipeline' },
      },
    ],
  };

  return schema;
};

test.describe('PRD Aligned E2E - Layout Driven Runtime', () => {
  test('discussion rounds and downstream pipeline follow workflow layout nodes', async ({ request }) => {
    test.setTimeout(120000);

    const fixture = await loadExampleSchema('software-delivery-team.json');
    bindAgentsToDeterministicFallback(fixture);

    const schema = createLayoutDrivenRuntimeSchema(fixture);
    const started = await startRuntimeSession(request, schema, 'Run layout driven runtime flow');
    const finalSession = await advanceUntilStable(request, started, 12);
    const discussionResult = finalSession.state.discussionResult as {
      connectedTargets?: Array<{
        targetId?: string;
        kind?: string;
      }>;
      blackboard?: {
        upstreamInputs?: Array<{ source?: string }>;
        entries?: Array<{ authorAgentId?: string; sourceTargetIds?: string[] }>;
      };
      turns?: Array<{
        round?: number;
        agentId?: string;
        structuredOutput?: { mode?: string };
      }>;
    } | undefined;
    const turnAgents = (discussionResult?.turns ?? []).map((turn) => turn.agentId);
    const turnRounds = (discussionResult?.turns ?? []).map((turn) => turn.round);
    const turnModes = (discussionResult?.turns ?? []).map((turn) => turn.structuredOutput?.mode);
    const connectedTargetKinds = new Set((discussionResult?.connectedTargets ?? []).map((target) => target.kind));
    const blackboardEntryAuthors = (discussionResult?.blackboard?.entries ?? []).map((entry) => entry.authorAgentId);
    const blackboardInputSources = new Set((discussionResult?.blackboard?.upstreamInputs ?? []).map((input) => input.source));
    const completedStepAgentIds = Array.isArray(finalSession.state.completedStepResults)
      ? (finalSession.state.completedStepResults as Array<{ ownerAgentId?: string }>).map((step) => step.ownerAgentId)
      : [];

    expect(turnAgents).toEqual([
      'tech_lead',
      'executor',
      'tech_lead',
      'executor',
    ]);
    expect(turnRounds).toEqual([1, 1, 2, 2]);
    expect(turnModes.every((mode) => mode === 'sequential_handoff')).toBeTruthy();
    expect(connectedTargetKinds.has('department')).toBeTruthy();
    expect(connectedTargetKinds.has('agent')).toBeTruthy();
    expect(connectedTargetKinds.has('pipeline')).toBeTruthy();
    expect(blackboardInputSources.has('task')).toBeTruthy();
    expect(blackboardEntryAuthors).toEqual(turnAgents);
    expect(finalSession.state.interruption).toBeUndefined();
    expect(completedStepAgentIds).toEqual(['tech_lead', 'executor']);
  });

  test('runtime view shows discussion blackboard and connected targets', async ({ page, request }) => {
    test.setTimeout(120000);

    const fixture = await loadExampleSchema('software-delivery-team.json');
    bindAgentsToDeterministicFallback(fixture);

    const workspaceKey = buildWorkspaceKey('e2e-layout-ui');
    const schema = createLayoutDrivenRuntimeSchema(fixture);
    schema.team_id = workspaceKey;
    schema.team_name = `E2E Layout UI ${workspaceKey}`;

    await upsertSchema(request, workspaceKey, schema);

    try {
      await openWorkspace(page, workspaceKey);
      await page.getByLabel('Run mode').click();
      await page.waitForURL(new RegExp(`/workspaces/${workspaceKey}/run`));

      const goalInput = page.getByPlaceholder('Type your goal and press Enter');
      await goalInput.fill('Render discussion blackboard');
      await goalInput.press('Enter');

      await expect(page.locator('[data-testid="runtime-latest-output"]')).toBeVisible();

      const discussionNode = page.locator('.react-flow__node[data-id="discussion"]').first();
      await expect(discussionNode).toBeVisible();
      await page.evaluate(() => {
        const node = document.querySelector('.react-flow__node[data-id="discussion"]');

        if (node instanceof HTMLElement) {
          node.click();
        }
      });
      await expect(page.getByText('Runtime Node Details')).toBeVisible();

      const connectedTargetsPanel = page.locator('[data-testid="discussion-connected-targets"]');
      const blackboardPanel = page.locator('[data-testid="discussion-blackboard-panel"]');

      await expect(connectedTargetsPanel).toBeVisible();
      await expect(blackboardPanel).toBeVisible();
      await expect(connectedTargetsPanel.getByText('Engineering', { exact: true })).toBeVisible();
      await expect(connectedTargetsPanel.getByText('Tech Lead Flow', { exact: true })).toBeVisible();
      await expect(connectedTargetsPanel.getByText('Delivery Pipeline', { exact: true })).toBeVisible();
      await expect(blackboardPanel.getByText('Upstream Inputs')).toBeVisible();
      await expect(blackboardPanel.getByText(/task/i)).toBeVisible();
      await expect(blackboardPanel.getByText('Blackboard Entries')).toBeVisible();
    } finally {
      await deleteSchemaIfExists(request, workspaceKey);
    }
  });
});