import { expect, test, type Page } from '@playwright/test';

import {
  buildWorkspaceKey,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  upsertSchema,
} from './helpers/e2eApi';

const parseLinkCount = async (page: Page): Promise<number> => {
  const linkChip = page.getByText(/\d+ links/).first();
  const label = (await linkChip.textContent()) ?? '';
  const matched = /^(\d+)\s+links$/.exec(label.trim());

  return matched === null ? -1 : Number(matched[1]);
};

const selectFieldOption = async (page: Page, label: string, optionLabel: string): Promise<void> => {
  await page.getByLabel(label).click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
};

test.describe('PRD Aligned E2E - Pipeline Cycle Reject', () => {
  test('E2E-007 Pipeline Cycle Reject / TEST-003 (UI DAG cycle guard)', async ({ page, request }) => {
    const fixture = await loadExampleSchema('software-delivery-team.json');
    const workspaceKey = buildWorkspaceKey('e2e-007');

    fixture.team_id = workspaceKey;
    fixture.team_name = `E2E Pipeline DAG ${workspaceKey}`;

    await upsertSchema(request, workspaceKey, fixture);

    try {
      await openWorkspace(page, workspaceKey);

      await page.getByRole('button', { name: 'Agent node' }).click();
      await page.getByRole('button', { name: 'Agent node' }).click();

      await expect(page.getByText('2 draft nodes')).toBeVisible();

      await selectFieldOption(page, 'Source', 'Agent Node 1');
      await selectFieldOption(page, 'Target', 'Agent Node 2');
      await selectFieldOption(page, 'Edge Type', 'Pipeline');
      await page.getByRole('button', { name: 'Create edge' }).click();
      const linkCountAfterFirstEdge = await parseLinkCount(page);

      await selectFieldOption(page, 'Source', 'Agent Node 2');
      await selectFieldOption(page, 'Target', 'Agent Node 1');
      await page.getByRole('button', { name: 'Create edge' }).click();
      const linkCountAfterRejectedEdge = await parseLinkCount(page);

      await expect(page.getByText('Pipeline edge rejected: it would create a cycle. Pipeline children must form a DAG.')).toBeVisible();
      expect(linkCountAfterFirstEdge).toBeGreaterThan(0);
      expect(linkCountAfterRejectedEdge).toBe(linkCountAfterFirstEdge);
    } finally {
      await deleteSchemaIfExists(request, workspaceKey);
    }
  });
});
