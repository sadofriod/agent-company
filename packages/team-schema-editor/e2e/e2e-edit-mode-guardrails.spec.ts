import { expect, test } from '@playwright/test';

import {
  buildWorkspaceKey,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  upsertSchema,
} from './helpers/e2eApi';

test.describe('PRD Aligned E2E - Edit Mode Guardrails', () => {
  test('E2E-003 Edit Mode Guardrails / TEST-002 (invalid supervisor reference blocks validation)', async ({
    page,
    request,
  }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const workspaceKey = buildWorkspaceKey('e2e-003');

    fixture.team_id = workspaceKey;
    fixture.team_name = `E2E Guardrail ${workspaceKey}`;
    fixture.discussion_policy = {
      ...(fixture.discussion_policy as Record<string, unknown>),
      supervisor_agent_id: 'agent-not-exists',
    };

    await upsertSchema(request, workspaceKey, fixture);

    try {
      await openWorkspace(page, workspaceKey);
      await page.getByRole('button', { name: 'Validate schema' }).click();
      await expect(page.getByText('discussion_policy.supervisor_agent_id')).toBeVisible();
      await expect(page.getByText(/不存在的 Agent|not found/i)).toBeVisible();
    } finally {
      await deleteSchemaIfExists(request, workspaceKey);
    }
  });
});
