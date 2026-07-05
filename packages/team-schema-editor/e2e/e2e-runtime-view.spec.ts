import { expect, test } from '@playwright/test';

import {
  buildWorkspaceKey,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  upsertSchema,
} from './helpers/e2eApi';
import { bindAllAgentsToLmStudio } from './helpers/lmstudio';

test.describe('PRD Aligned E2E - Runtime View Projection', () => {
  test('E2E-004 Runtime View Projection (run mode session and node detail drawer)', async ({ page, request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const workspaceKey = buildWorkspaceKey('e2e-004');

    fixture.team_id = workspaceKey;
    fixture.team_name = `E2E Runtime View ${workspaceKey}`;
    bindAllAgentsToLmStudio(fixture);

    await upsertSchema(request, workspaceKey, fixture);

    try {
      await openWorkspace(page, workspaceKey);
      await page.getByLabel('Run mode').click();
      await page.waitForURL(new RegExp(`/workspaces/${workspaceKey}/run`));
      await expect(page.getByText('Run Sessions')).toBeVisible();

      const startSessionResponsePromise = page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && response.url().endsWith('/runtime/session')
      ));

      const runInput = page.getByPlaceholder('Type your goal and press Enter');
      await runInput.fill('Execute runtime view projection test goal');
      await runInput.press('Enter');

      const startSessionResponse = await startSessionResponsePromise;
      expect(startSessionResponse.ok()).toBeTruthy();

      await expect(page.getByText('No sessions yet. Run once to create a session.')).not.toBeVisible();
      await expect(page.getByText(/^Status:\s+/)).toBeVisible();

      const goalNode = page.locator('.react-flow__node[data-id="goal"]').first();
      await expect(goalNode).toBeVisible();
      await goalNode.click({ force: true });
    } finally {
      await deleteSchemaIfExists(request, workspaceKey);
    }
  });
});
