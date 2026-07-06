import { test, expect, type Page } from '@playwright/test';

const createWorkspace = async (page: Page, workspaceKey: string): Promise<void> => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Team Schema Editor/);

  const workspaceInput = page.getByLabel('Workspace key');
  await expect(workspaceInput).toBeVisible();
  await expect(workspaceInput).toBeEnabled();
  await workspaceInput.fill(workspaceKey);
  await expect(workspaceInput).toHaveValue(workspaceKey);

  const createButton = page.getByRole('button', { name: 'Create' });
  await expect(createButton).toBeEnabled();
  await createButton.click();

  await page.waitForURL(new RegExp(`/workspaces/${workspaceKey}`));
  await expect(page.getByText(workspaceKey).first()).toBeVisible();
};

const deleteWorkspace = async (page: Page, workspaceKey: string): Promise<void> => {
  const deleteWorkspaceBtn = page.getByRole('button', { name: 'Delete workspace' });
  await expect(deleteWorkspaceBtn).toBeVisible();
  await deleteWorkspaceBtn.click();

  await page.waitForURL('/');
  await expect(page.getByText(workspaceKey)).not.toBeVisible();
};

const parseCount = (text: string | null): number => Number(text?.split(' ')[0] ?? '0');

const readGraphSummary = async (page: Page): Promise<{ departments: number; agents: number; links: number }> => ({
  departments: parseCount(await page.getByText(/departments$/).textContent()),
  agents: parseCount(await page.getByText(/agents$/).textContent()),
  links: parseCount(await page.getByText(/links$/).textContent()),
});

const clickGraphEdgeInteraction = async (page: Page, edgeId: string): Promise<void> => {
  const edgePath = page.locator(`g[data-id="${edgeId}"] path.react-flow__edge-interaction`).first();
  const clickPoint = await edgePath.evaluate((path) => {
    const ctm = path.getScreenCTM();
    const edgeElement = path.closest('[data-id]');

    if (ctm === null || edgeElement === null) {
      throw new Error('Graph edge is not ready for interaction.');
    }

    const total = path.getTotalLength();
    const ratios = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9];

    for (const ratio of ratios) {
      const point = path.getPointAtLength(total * ratio);
      const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(ctm);
      const hitElement = document.elementFromPoint(screenPoint.x, screenPoint.y);
      const hitEdgeElement = hitElement?.closest('[data-id]');

      if (hitEdgeElement?.getAttribute('data-id') === edgeElement.getAttribute('data-id')) {
        return { x: screenPoint.x, y: screenPoint.y };
      }
    }

    const fallbackPoint = path.getPointAtLength(total * 0.1);
    const fallbackScreenPoint = new DOMPoint(fallbackPoint.x, fallbackPoint.y).matrixTransform(ctm);

    return { x: fallbackScreenPoint.x, y: fallbackScreenPoint.y };
  });

  await page.mouse.click(clickPoint.x, clickPoint.y);
};

test.describe('Workflow Nodes CRUD', () => {
  // 生产临时 workspace key，避免与其他测试或现有数据冲突
  const testWorkspaceKey = `e2e-nodes-temp-${Date.now()}`;

  test('should successfully complete Nodes CRUD, edit fields, and cleanup', async ({ page }) => {
    // 1. 创建一个临时的 Workspace 并进入编辑器
    await createWorkspace(page, testWorkspaceKey);

    // 默认应该没有任何 draft 节点
    await expect(page.getByText('0 draft nodes')).toBeVisible();

    // 4. 增加节点 (Create): 点击 "Agent node"
    const agentNodeBtn = page.getByRole('button', { name: 'Agent node' });
    await expect(agentNodeBtn).toBeVisible();
    await agentNodeBtn.click();

    // 验证 draft 节点个数递增
    await expect(page.getByText('1 draft nodes')).toBeVisible();

    // Canvas 中应该产生了 "Agent Node 1" 这个节点主体
    const reactFlowNode = page.locator('.react-flow__node').filter({ hasText: 'Agent Node 1' });
    await expect(reactFlowNode).toBeVisible();

    // 5. 查看节点属性 (Read): 点击节点，Inspector 展示详情
    await reactFlowNode.click();

    // Inspector 的标题现在应该显示节点名字
    const inspectorHeading = page.locator('main').locator('h6').filter({ hasText: 'Agent Node 1' });
    await expect(inspectorHeading).toBeVisible();

    // 6. 编辑节点 (Update)
    // 修改 Node Name
    const nameInput = page.getByLabel('Node Name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('');
    await nameInput.fill('E2E Edited Agent Node');

    // 修改 Node Description
    const descInput = page.getByLabel('Node Description');
    await expect(descInput).toBeVisible();
    await descInput.fill('');
    await descInput.fill('This node is edited by E2E test scripts automatically.');

    // 验证修改后 Canvas 上的节点名称已经同步变为新文本
    const editedFlowNode = page.locator('.react-flow__node').filter({ hasText: 'E2E Edited Agent Node' });
    await expect(editedFlowNode).toBeVisible();

    // 7. 删除节点 (Delete)
    const deleteNodeBtn = page.getByRole('button', { name: 'Delete Workflow Node' });
    await expect(deleteNodeBtn).toBeVisible();
    await deleteNodeBtn.click();

    // 验证 draft 节点数回落到 0，并且 Canvas 里已经找不到刚才删除的节点
    await expect(page.getByText('0 draft nodes')).toBeVisible();
    await expect(editedFlowNode).not.toBeVisible();

    // 8. 清理工作区 (Cleanup): 点击右上角垃圾桶按钮删除整个测试 Workspace
    await deleteWorkspace(page, testWorkspaceKey);
  });

  test('should delete selected draft nodes and workflow edges with keyboard shortcuts', async ({ page }) => {
    const keyboardWorkspaceKey = `e2e-graph-temp-${Date.now()}`;

    await createWorkspace(page, keyboardWorkspaceKey);
    await expect(page.getByText('0 draft nodes')).toBeVisible();

    await page.getByRole('button', { name: 'Agent node' }).click();
    const draftNode = page.locator('.react-flow__node').filter({ hasText: 'Agent Node 1' });
    await expect(draftNode).toBeVisible();

    await draftNode.click();
    await page.keyboard.press('Backspace');
    await expect(page.getByText('0 draft nodes')).toBeVisible();
    await expect(draftNode).not.toBeVisible();

    await page.getByRole('button', { name: 'Agent node' }).click();
    const recreatedDraftNode = page.locator('.react-flow__node').filter({ hasText: 'Agent Node 1' });
    await expect(recreatedDraftNode).toBeVisible();

    await page.getByRole('combobox', { name: 'Source' }).click();
    await page.getByRole('option', { name: 'Goal Input', exact: true }).click();
    await page.getByRole('combobox', { name: 'Target' }).click();
    await page.getByRole('option', { name: 'Agent Node 1', exact: true }).click();
    const initialLinkCount = parseCount(await page.getByText(/links$/).textContent());
    await page.getByRole('button', { name: 'Create edge' }).click();
    await expect(page.getByText(`${initialLinkCount + 1} links`)).toBeVisible();

    const workflowEdge = page.locator('g[data-id="workflow-link:1"]');
    await clickGraphEdgeInteraction(page, 'workflow-link:1');
    await expect(workflowEdge).toHaveClass(/selected/);
    await page.keyboard.press('Backspace');

    await expect(page.getByText(`${initialLinkCount} links`)).toBeVisible();
    await expect(workflowEdge).not.toBeVisible();
    await expect(recreatedDraftNode).toBeVisible();

    await deleteWorkspace(page, keyboardWorkspaceKey);
  });

  test('should delete base schema nodes and edges with keyboard shortcuts', async ({ page }) => {
    const baseGraphWorkspaceKey = `e2e-base-graph-temp-${Date.now()}`;

    await createWorkspace(page, baseGraphWorkspaceKey);
    const initialSummary = await readGraphSummary(page);
    const departmentNode = page.locator('.react-flow__node[data-id="department:product_intake"]').first();
    await departmentNode.click();
    await page.keyboard.press('Backspace');

    await expect(page.getByText(`${initialSummary.departments - 1} departments`)).toBeVisible();
    await expect(page.getByText(`${initialSummary.agents - 1} agents`)).toBeVisible();
    await expect(departmentNode).not.toBeVisible();

    await page.getByRole('button', { name: 'Reload workspace' }).click();
    await expect(page.getByText(`${initialSummary.departments} departments`)).toBeVisible();
    await expect(page.getByText(`${initialSummary.agents} agents`)).toBeVisible();

    const baseEdgeId = 'goal-department:product_intake';
    const baseEdge = page.locator(`g[data-id="${baseEdgeId}"]`);
    await baseEdge.focus();
    await page.keyboard.press('Enter');
    await expect(baseEdge).toHaveClass(/selected/);
    await page.keyboard.press('Backspace');

    await expect(page.getByText(`${initialSummary.departments - 1} departments`)).toBeVisible();
    await expect(page.getByText(`${initialSummary.agents - 1} agents`)).toBeVisible();
    await expect(baseEdge).not.toBeVisible();

    await deleteWorkspace(page, baseGraphWorkspaceKey);
  });
});
