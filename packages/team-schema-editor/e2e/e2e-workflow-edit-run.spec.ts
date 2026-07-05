import { expect, test, type Page } from '@playwright/test';

import {
  buildWorkspaceKey,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  upsertSchema,
  waitForRuntimeSession,
} from './helpers/e2eApi';
import { bindAllAgentsToLmStudio, lmStudioBinding } from './helpers/lmstudio';

const expectWorkflowCoreNodes = async (page: Page): Promise<void> => {
  await expect(page.locator('.react-flow__node[data-id="department:product"]')).toBeVisible();
  await expect(page.locator('.react-flow__node[data-id="department:engineering"]')).toBeVisible();
  await expect(page.locator('.react-flow__node[data-id="discussion"]')).toBeVisible();
};

const selectFieldOption = async (page: Page, label: string, optionLabelPattern: RegExp | string): Promise<void> => {
  await page.getByLabel(label).click();

  if (typeof optionLabelPattern === 'string') {
    await page.getByRole('option', { name: optionLabelPattern, exact: true }).click();
    return;
  }

  await page.getByRole('option', { name: optionLabelPattern }).first().click();
};

const assignAgentAndGateway = async (
  page: Page,
  workflowNodeName: string,
  agentDisplayName: string,
): Promise<void> => {
  const workflowNode = page.locator('.react-flow__node').filter({ hasText: workflowNodeName }).first();

  await expect(workflowNode).toBeVisible();
  await workflowNode.click();
  await selectFieldOption(page, 'Loaded Agent', agentDisplayName);
};

const runtimeGoal = 'Implement technical execution pipeline for engineering delivery';

test.describe('PRD Aligned E2E - Workflow Edit Then Run', () => {
  test('workflow edit binds all agents to LM Studio and scheduler executes after goal run', async ({ page, request }) => {
    test.setTimeout(120000);

    const fixture = await loadExampleSchema('software-delivery-team.json');
    const workspaceKey = buildWorkspaceKey('e2e-workflow-run');

    fixture.team_id = workspaceKey;
    fixture.team_name = `E2E Workflow Run ${workspaceKey}`;
    bindAllAgentsToLmStudio(fixture);

    const boundAgents = Array.isArray(fixture.agents)
      ? fixture.agents as Array<{ metadata?: { llm?: { provider?: string; model?: string; base_url?: string } }; model?: string }>
      : [];

    expect(boundAgents.every((agent) => (
      agent.metadata?.llm?.provider === lmStudioBinding.provider
      && agent.metadata.llm.model === lmStudioBinding.model
      && agent.metadata.llm.base_url === lmStudioBinding.baseUrl
      && agent.model === lmStudioBinding.model
    ))).toBeTruthy();

    await upsertSchema(request, workspaceKey, fixture);

    try {
      await openWorkspace(page, workspaceKey);
      await expectWorkflowCoreNodes(page);

      await page.getByRole('button', { name: 'Agent node' }).click();
      await expect(page.getByText('1 draft nodes')).toBeVisible();

      await assignAgentAndGateway(page, 'Agent Node 1', 'CEO');

      await page.getByLabel('Run mode').click();
      await page.waitForURL(new RegExp(`/workspaces/${workspaceKey}/run`));

      const startSessionResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().endsWith('/runtime/session')
      ));

      const goalInput = page.getByPlaceholder('Type your goal and press Enter');
      await goalInput.fill(runtimeGoal);
      await goalInput.press('Enter');

      const startSessionResponse = await startSessionResponsePromise;
      expect(startSessionResponse.ok()).toBeTruthy();
      const startSessionPayload = await startSessionResponse.json() as {
        data?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = startSessionPayload.data?.sessionId ?? startSessionPayload.sessionId;

      expect(typeof sessionId === 'string' && sessionId.length > 0).toBeTruthy();

      const latestSession = await waitForRuntimeSession(
        request,
        sessionId as string,
        (session) => {
          const completedCount = Array.isArray(session.state.completedStepResults)
            ? session.state.completedStepResults.length
            : 0;
          const reviewCount = Array.isArray(session.state.reviewResults)
            ? session.state.reviewResults.length
            : 0;

          return completedCount > 0 || reviewCount > 0 || session.state.interruption !== undefined || session.status !== 'running';
        },
        { maxAttempts: 40, intervalMs: 500 },
      );
      const completedStepResults = Array.isArray(latestSession.state.completedStepResults)
        ? latestSession.state.completedStepResults as Array<{
          output?: {
            agentExecution?: {
              promptSummary?: string;
              responseSummary?: string;
            };
          };
        }>
        : [];
      const reviewResults = Array.isArray(latestSession.state.reviewResults)
        ? latestSession.state.reviewResults
        : [];
      const interruption = latestSession.state.interruption as { kind?: string; message?: string } | undefined;
      const planAgents = Array.isArray(latestSession.runtimePlan.agents)
        ? latestSession.runtimePlan.agents as Array<{ metadata?: { llm?: { provider?: string; model?: string; base_url?: string } } }>
        : [];

      const fixtureAgents = Array.isArray(fixture.agents) ? fixture.agents : [];
      expect(planAgents).toHaveLength(fixtureAgents.length);
      expect(reviewResults.length).toBeGreaterThan(0);
      expect(planAgents.every((agent) => agent.metadata?.llm?.provider === lmStudioBinding.provider)).toBeTruthy();
      expect(
        completedStepResults.length > 0 || interruption?.kind !== undefined || reviewResults.length > 0,
        `completed=${completedStepResults.length}, interruption=${JSON.stringify(interruption)}, reviewResults=${reviewResults.length}, nextAction=${latestSession.state.nextAction}`,
      ).toBeTruthy();

      const firstExecution = completedStepResults[0]?.output?.agentExecution;
      if (firstExecution !== undefined) {
        expect(firstExecution.promptSummary?.includes(`Goal: ${runtimeGoal}.`)).toBeTruthy();
        expect(
          firstExecution.responseSummary?.includes('LLM call failed'),
          `responseSummary=${firstExecution.responseSummary ?? 'undefined'}`,
        ).not.toBeTruthy();
      }
    } finally {
      await deleteSchemaIfExists(request, workspaceKey);
    }
  });
});
