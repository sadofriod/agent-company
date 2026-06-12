import { test, expect } from '@playwright/test';

test.describe('Workflow Nodes CRUD', () => {
  // 生产临时 workspace key，避免与其他测试或现有数据冲突
  const testWorkspaceKey = `e2e-nodes-temp-${Date.now()}`;

  test('should successfully complete Nodes CRUD, edit fields, and cleanup', async ({ page }) => {
    // 1. 进入主页，验证主页正常加载
    await page.goto('/');
    await expect(page).toHaveTitle(/Team Schema Editor/);

    // 2. 创建一个临时的 Workspace
    const workspaceInput = page.getByLabel('Workspace key');
    await expect(workspaceInput).toBeVisible();
    await expect(workspaceInput).toBeEnabled();
    await workspaceInput.fill(testWorkspaceKey);
    await expect(workspaceInput).toHaveValue(testWorkspaceKey);

    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // 3. 验证是否跳转到对应的 Workspace 编辑器路由并正确加载
    await page.waitForURL(new RegExp(`/workspaces/${testWorkspaceKey}`));
    await expect(page.getByText(testWorkspaceKey).first()).toBeVisible();

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
    const deleteWorkspaceBtn = page.getByRole('button', { name: 'Delete workspace' });
    await expect(deleteWorkspaceBtn).toBeVisible();
    await deleteWorkspaceBtn.click();

    // 验证返回主页
    await page.waitForURL('/');
    // 列表中应当找不到刚才删除的临时 Workspace Key
    await expect(page.getByText(testWorkspaceKey)).not.toBeVisible();
  });
});
