import { expect, test } from '@playwright/test';

import {
  buildWorkspaceKey,
  createDepartmentVariant,
  deleteSchemaIfExists,
  loadExampleSchema,
  openWorkspace,
  postRuntimePlan,
  upsertSchema,
} from './helpers/e2eApi';

test.describe('PRD Aligned E2E - Schema Loading', () => {
  const workspaceKeys: string[] = [];

  test.afterAll(async ({ request }) => {
    await Promise.all(workspaceKeys.map((key) => deleteSchemaIfExists(request, key)));
  });

  for (const departmentCount of [1, 2, 5]) {
    test(`E2E-001 Dynamic Department Loading / TEST-001 (${departmentCount} departments)`, async ({ page, request }) => {
      const fixture = await loadExampleSchema('software-delivery-team.json');
      const schema = createDepartmentVariant(fixture, departmentCount);
      const workspaceKey = buildWorkspaceKey(`e2e-001-${departmentCount}`);

      workspaceKeys.push(workspaceKey);
      await upsertSchema(request, workspaceKey, schema);

      await openWorkspace(page, workspaceKey);
      await expect(page.getByText(`${departmentCount} departments`).first()).toBeVisible();

      const runtimePlanPayload = await postRuntimePlan(request, schema);
      const planTeam = (runtimePlanPayload.runtimePlan as { team?: { departments?: unknown[] } })?.team;

      expect(planTeam?.departments?.length).toBe(departmentCount);
    });
  }
});
