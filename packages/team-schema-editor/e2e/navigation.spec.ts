import { test, expect } from '@playwright/test';

test.describe('Workspace Navigation and Loading Loading State Coverage', () => {
  test('should load "current" workspace without getting stuck in loading state', async ({ page }) => {
    // 1. Visit the home page (Workspace List)
    await page.goto('/');
    await expect(page).toHaveTitle(/Team Schema Editor/);

    // 2. Ensure "current" workspace is in the list
    const currentWorkspaceItem = page.getByRole('button', { name: /current/ });
    await expect(currentWorkspaceItem).toBeVisible();

    // 3. Click the "current" workspace item to navigate to its page
    await currentWorkspaceItem.click();

    // 4. Verify we are navigated to the correct workspace route
    await page.waitForURL(/\/workspaces\/current/);

    // 5. Verify the workspace page loads successfully and doesn't get stuck in "Loading from service"
    // We should expect the "Flow Editor" heading and node elements to eventually show up
    await expect(page.getByText('Loading from service')).not.toBeVisible();
    await expect(page.getByText('Workspace Editor')).toBeVisible();
    
    // Check for some Flow Editor elements or specific headings
    await expect(page.getByText('Flow Editor')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Software Delivery Team' }).first()).toBeVisible();

    // 6. Navigate back to workspace list by clicking "Workspaces" button
    const backBtn = page.getByRole('button', { name: 'Workspaces' });
    await expect(backBtn).toBeVisible();
    await backBtn.click();

    await page.waitForURL('/');
    await expect(page.getByText('Team Schema List')).toBeVisible();

    // 7. Click again on "current" workspace to ensure re-navigation has no issues or caching conflicts
    const currentWorkspaceItem2 = page.getByRole('button', { name: /current/ });
    await expect(currentWorkspaceItem2).toBeVisible();
    await currentWorkspaceItem2.click();

    await page.waitForURL(/\/workspaces\/current/);
    await expect(page.getByText('Loading from service')).not.toBeVisible();
    await expect(page.getByText('Flow Editor')).toBeVisible();

    // 8. Test direct page reload to make sure deep linking loads successfully as well
    await page.reload();
    await expect(page.getByText('Loading from service')).not.toBeVisible();
    await expect(page.getByText('Flow Editor')).toBeVisible();
  });

  test('should click and inspect all types of seeded agent nodes successfully without crashing', async ({ page }) => {
    // 1. Visit the home page (Workspace List)
    await page.goto('/');
    await expect(page).toHaveTitle(/Team Schema Editor/);

    // 2. Click the "current" workspace item
    const currentWorkspaceItem = page.getByRole('button', { name: /current/ });
    await expect(currentWorkspaceItem).toBeVisible();
    await currentWorkspaceItem.click();

    // 3. Verify workspace page loads
    await page.waitForURL(/\/workspaces\/current/);
    await expect(page.getByText('Loading from service')).not.toBeVisible();
    await expect(page.getByText('Flow Editor')).toBeVisible();

    // --- 4. Click and inspect CTO node ---
    const ctoNode = page.locator('.react-flow__node').filter({ hasText: 'CTO' }).first();
    await expect(ctoNode).toBeVisible();
    await ctoNode.click();

    // Verify Inspector details are loaded safely config
    await expect(page.getByRole('heading', { name: 'CTO', exact: true })).toBeVisible();
    const ctoMetadataName = page.getByLabel('Metadata Name');
    await expect(ctoMetadataName).toBeVisible();
    await expect(ctoMetadataName).toHaveValue('CTO');

    const ctoToolsInput = page.getByLabel('Tools', { exact: true });
    await expect(ctoToolsInput).toBeVisible();
    await expect(ctoToolsInput).toHaveValue(''); // CTO/tech_lead has no tools parameter in initial schema

    // Try filling tools and verify it updates
    await ctoToolsInput.fill('architect_eye\nschema_compiler');
    await expect(ctoToolsInput).toHaveValue('architect_eye\nschema_compiler');

    // --- 5. Click and inspect CEO node ---
    const ceoNode = page.locator('.react-flow__node').filter({ hasText: 'CEO' }).first();
    await expect(ceoNode).toBeVisible();
    await ceoNode.click();

    // Verify Inspector details are loaded safely config
    await expect(page.getByRole('heading', { name: 'CEO', exact: true })).toBeVisible();
    const ceoMetadataName = page.getByLabel('Metadata Name');
    await expect(ceoMetadataName).toBeVisible();
    await expect(ceoMetadataName).toHaveValue('CEO');

    // Ensure we can inspect other properties of CEO
    const ceoRoleInput = page.getByLabel('Role');
    await expect(ceoRoleInput).toBeVisible();
    await expect(ceoRoleInput).toHaveValue('Topic Owner');

    // --- 6. Click and inspect FullStackEngineer node ---
    const fullStackNode = page.locator('.react-flow__node').filter({ hasText: 'FullStackEngineer' }).first();
    await expect(fullStackNode).toBeVisible();
    await fullStackNode.click();

    // Verify Inspector details are loaded safely config
    await expect(page.getByRole('heading', { name: 'FullStackEngineer', exact: true })).toBeVisible();
    const fullStackMetadataName = page.getByLabel('Metadata Name');
    await expect(fullStackMetadataName).toBeVisible();
    await expect(fullStackMetadataName).toHaveValue('FullStackEngineer');

    const fullStackToolsInput = page.getByLabel('Tools', { exact: true });
    await expect(fullStackToolsInput).toBeVisible();
    await expect(fullStackToolsInput).toHaveValue('search\nread_file\nedit_file\nrun_tests'); // loaded from initial schema
  });
});
