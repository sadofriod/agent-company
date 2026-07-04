import { test, expect } from '@playwright/test';

test.describe('Detailed Forms Inspections & Coverage', () => {
  const testWorkspaceKey = `e2e-forms-temp-${Date.now()}`;

  test('should inspect and correctly edit all types of node forms', async ({ page }) => {
    // 1. 进入主页，建立并进入干净的临时 Workspace 体系中
    await page.goto('/');
    await expect(page).toHaveTitle(/Team Schema Editor/);

    const workspaceInput = page.getByLabel('Workspace key');
    await expect(workspaceInput).toBeVisible();
    await expect(workspaceInput).toBeEnabled();
    await workspaceInput.fill(testWorkspaceKey);
    await expect(workspaceInput).toHaveValue(testWorkspaceKey);

    const createButton = page.getByRole('button', { name: 'Create' });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    await page.waitForURL(new RegExp(`/workspaces/${testWorkspaceKey}`));
    await expect(page.getByText(testWorkspaceKey).first()).toBeVisible();

    // ==========================================
    // 2. Team Form (Goal Node) 编辑性与值持久化校验
    // ==========================================
    const goalNode = page.locator('.react-flow__node').filter({ hasText: 'Goal Input' }).first();
    await expect(goalNode).toBeVisible();
    await goalNode.click();

    // 检查 Inspector 的 Team 选项表单域
    await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible();

    const schemaVersionInput = page.getByLabel('Schema Version');
    await expect(schemaVersionVersionLabelCheck(page)).toBeTruthy(); // 确保表单可见
    await schemaVersionInput.fill('0.9.9');
    await expect(schemaVersionInput).toHaveValue('0.9.9');

    const teamIdInput = page.getByLabel('Team Id');
    await teamIdInput.fill('e2e-validated-team-id');
    await expect(teamIdInput).toHaveValue('e2e-validated-team-id');

    const teamNameInput = page.getByLabel('Team Name');
    await teamNameInput.fill('E2E Real Team Name');
    await expect(teamNameInput).toHaveValue('E2E Real Team Name');

    // ==========================================
    // 3. Department Form (Product Department)
    // ==========================================
    // 默认 seeded 的第一个 department node 为 Product
    const departmentNode = page.locator('.react-flow__node').filter({ hasText: 'Product' }).first();
    await expect(departmentNode).toBeVisible();
    await departmentNode.click();

    await expect(page.getByRole('heading', { name: 'Product', exact: true })).toBeVisible();

    const deptNameInput = page.getByLabel('Name', { exact: true });
    await deptNameInput.fill('E2E Product Dept');
    await expect(deptNameInput).toHaveValue('E2E Product Dept');

    const deptMissionInput = page.getByLabel('Mission');
    await deptMissionInput.fill('E2E validation mission.');
    await expect(deptMissionInput).toHaveValue('E2E validation mission.');

    const deptDecisionInput = page.getByLabel('Decision Scope').first();
    await deptDecisionInput.click();
    await page.getByRole('option', { name: 'topic', exact: true }).last().click();
    await page.getByRole('option', { name: 'decision', exact: true }).last().click();
    await page.keyboard.press('Escape');
    await expect(deptDecisionInput).toContainText('topic');
    await expect(deptDecisionInput).toContainText('decision');

    const deptHandoffInput = page.getByLabel('Handoff Contracts').first();
    await deptHandoffInput.click();
    await page.getByRole('option', { name: 'topic_brief', exact: true }).last().click();
    await page.getByRole('option', { name: 'decision_record', exact: true }).last().click();
    await page.keyboard.press('Escape');
    await expect(deptHandoffInput).toContainText('topic_brief');
    await expect(deptHandoffInput).toContainText('decision_record');

    // ==========================================
    // 4. Agent Form (CEO Agent)
    // ==========================================
    // 默认的 Product 下 Agent 是 CEO
    const agentNode = page.locator('.react-flow__node').filter({ hasText: 'CEO' }).first();
    await expect(agentNode).toBeVisible();
    await agentNode.click();

    await expect(page.getByRole('heading', { name: 'CEO', exact: true })).toBeVisible();

    // 检查并填充运行时属性
    const agentRoleInput = page.getByLabel('Role');
    await agentRoleInput.fill('Chief Validation Executive');
    await expect(agentRoleInput).toHaveValue('Chief Validation Executive');

    const agentModelInput = page.getByLabel('Model').first();
    await expect(agentModelInput).toContainText('default-reasoning-model');

    const agentDescInput = page.getByLabel('Description', { exact: true });
    await agentDescInput.fill('E2E Tester Agent Role Description.');
    await expect(agentDescInput).toHaveValue('E2E Tester Agent Role Description.');

    const agentRespInput = page.getByLabel('Responsibilities');
    await agentRespInput.fill('validate_all_inputs\nproduce_accurate_assertions');
    await expect(agentRespInput).toHaveValue('validate_all_inputs\nproduce_accurate_assertions');

    const agentSkillsInput = page.getByRole('combobox', { name: 'Skills' });
    await expect(agentSkillsInput).toContainText('requirements_breakdown');

    const agentMemPolicyInput = page.getByLabel('Memory Profile').first();
    await agentMemPolicyInput.click();
    await page.getByRole('option', { name: 'topic_owner_policy', exact: true }).last().click();
    await expect(agentMemPolicyInput).toContainText('topic_owner_policy');

    // 检查并填充 Metadata 区属性 (Read-Only)
    await expect(page.getByText('Name:').first()).toBeVisible();
    await expect(page.getByText('CEO').first()).toBeVisible();

    // ==========================================
    // 5. Discussion Policy Form
    // ==========================================
    const discussionNode = page.locator('.react-flow__node').filter({ hasText: 'Discussion Policy' }).first();
    await expect(discussionNode).toBeVisible();
    await discussionNode.click();

    await expect(page.getByRole('heading', { name: 'Discussion Policy', exact: true })).toBeVisible();

    const discModeInput = page.getByLabel('Mode', { exact: true }).first();
    await discModeInput.click();
    await page.getByRole('option', { name: 'parallel_review', exact: true }).last().click();
    await expect(discModeInput).toContainText('parallel_review');

    const discRoundsInput = page.getByLabel('Max Rounds');
    await discRoundsInput.fill('9');
    await expect(discRoundsInput).toHaveValue('9');

    const discSupervisorInput = page.getByLabel('Supervisor Agent Id').first();
    await discSupervisorInput.click();
    await page.getByRole('option', { name: 'CTO', exact: true }).last().click();
    await expect(discSupervisorInput).toContainText('CTO');

    const discConflictInput = page.getByLabel('Conflict Resolution').first();
    await discConflictInput.click();
    await page.getByRole('option', { name: 'block_and_escalate', exact: true }).last().click();
    await expect(discConflictInput).toContainText('block_and_escalate');

    // ==========================================
    // 6. Memory Policy Form (Discussion/Session Memory)
    // ==========================================
    const memoryNode = page.locator('.react-flow__node').filter({ hasText: 'Discussion Memory' }).first();
    await expect(memoryNode).toBeVisible();
    await memoryNode.click();

    await expect(page.getByRole('heading', { name: 'Memory Policy', exact: true })).toBeVisible();

    const memModeInput = page.getByLabel('Retrieval Mode').first();
    await memModeInput.click();
    await page.getByRole('option', { name: 'standard_rag', exact: true }).last().click();
    await expect(memModeInput).toContainText('standard_rag');

    const memVectorStoreInput = page.getByLabel('Vector Store');
    await memVectorStoreInput.fill('milvus_db');
    await expect(memVectorStoreInput).toHaveValue('milvus_db');

    const memGraphStoreInput = page.getByLabel('Graph Store');
    await memGraphStoreInput.fill('neo4j_custom');
    await expect(memGraphStoreInput).toHaveValue('neo4j_custom');

    const memIndexedTypesInput = page.getByRole('combobox', { name: 'Indexed Object Types' });
    await memIndexedTypesInput.click();
    await page.getByRole('option', { name: 'pipeline' }).filter({ visible: true }).click();
    await page.keyboard.press('Escape');
    await expect(memIndexedTypesInput).toContainText('pipeline');

    const memEvidenceInput = page.getByRole('combobox', { name: 'Evidence Required Outputs' });
    await memEvidenceInput.click();
    await page.getByRole('option', { name: 'decision' }).filter({ visible: true }).click();
    await page.getByRole('option', { name: 'ticket' }).filter({ visible: true }).click();
    await page.keyboard.press('Escape');
    await expect(memEvidenceInput).not.toContainText('decision');
    await expect(memEvidenceInput).not.toContainText('ticket');

    const memConflictInput = page.getByRole('combobox', { name: 'Conflict Strategy' });
    await memConflictInput.click();
    await page.getByRole('option', { name: 'block_on_conflict' }).filter({ visible: true }).click();
    await expect(memConflictInput).toContainText('block_on_conflict');

    // 测试添加 & 删除 Memory Profile 的复杂局部 UI 表单
    const addProfileBtn = page.getByRole('button', { name: 'Add profile' });
    await expect(addProfileBtn).toBeVisible();
    await addProfileBtn.click();

    // 发现新增空白 Memory Profile 表单卡片
    // 它的默认 profile_id 应该是空的，我们可以根据标签寻找
    // 我们定位包含 "Profile ID"、"Allowed Scopes" 等表单卡片的组件包结构
    const profileIdInput = page.getByLabel('Profile ID').last();
    await expect(profileIdInput).toBeVisible();
    await profileIdInput.fill('e2e_profile_999');
    await expect(profileIdInput).toHaveValue('e2e_profile_999');

    const allowedScopesInput = page.getByLabel('Allowed Scopes').last();
    await allowedScopesInput.click();
    await page.getByRole('option', { name: 'session', exact: true }).last().click();
    await page.getByRole('option', { name: 'topic', exact: true }).last().click();
    await page.keyboard.press('Escape');
    await expect(allowedScopesInput).toContainText('session');
    await expect(allowedScopesInput).toContainText('topic');

    const maxResultsInput = page.getByLabel('Max Results').last();
    await maxResultsInput.fill('33');
    await expect(maxResultsInput).toHaveValue('33');

    const maxHopsInput = page.getByLabel('Max Graph Hops').last();
    await maxHopsInput.fill('5');
    await expect(maxHopsInput).toHaveValue('5');

    // 开启/关闭 "Require reviewed memory" 选择框
    const checkLabel = page.getByLabel('Require reviewed memory').last();
    await checkLabel.check();
    await expect(checkLabel).toBeChecked();

    // 删除刚增加的 Memory Profile
    const deleteProfileBtn = page.getByRole('button', { name: 'Delete Profile' }).last();
    await deleteProfileBtn.click();
    await expect(page.locator('input[value="e2e_profile_999"]')).not.toBeVisible();

    // ==========================================
    // 7. Workflow Agent Node + 嵌入 Agent 表单级联动测试
    // ==========================================
    const addAgentNodeBtn = page.getByRole('button', { name: 'Agent node' });
    await addAgentNodeBtn.click();

    // 选中新产生的 draft 节点 "Agent Node 1"
    const draftAgentNode = page.locator('.react-flow__node').filter({ hasText: 'Agent Node 1' }).first();
    await expect(draftAgentNode).toBeVisible();
    await draftAgentNode.click();

    // 在右侧 Inspector 验证 Workflow Node 表单
    await expect(page.getByRole('heading', { name: 'Agent Node 1', exact: true })).toBeVisible();

    const nodeNameField = page.getByLabel('Node Name');
    await nodeNameField.fill('E2E Flow Agent');
    await expect(nodeNameField).toHaveValue('E2E Flow Agent');

    const nodeDescField = page.getByLabel('Node Description');
    await nodeDescField.fill('E2E level agent inside workflow graph.');
    await expect(nodeDescField).toHaveValue('E2E level agent inside workflow graph.');

    // 测试下拉框联动：Loaded Agent
    const loadedAgentSelect = page.getByLabel('Loaded Agent').first();
    await expect(loadedAgentSelect).toBeVisible();
    await loadedAgentSelect.click();

    // 在下拉菜单中选择 "CEO" 或 "product_owner" 对应的选值
    // UI 中生成的 MenuItem 会以 Agent 名字作为显示值
    // 我们可以直接点击下拉项中匹配 "product_owner" 或 "CEO" (在 initial data 中，其 metadata name 是 CEO)
    // 让我们在弹出层里面定位
    const agentOption = page.getByRole('option', { name: 'CEO' }).first();
    await expect(agentOption).toBeVisible();
    await agentOption.click();

    // 验证下拉值已被选中，并且联动渲染出了 Agent 的 Role 字段
    // 因为 assigned 了 agent: product_owner，其 properties 会被展示到 Workflow Node 底下
    const nestedRoleInput = page.locator('main').getByLabel('Role').first();
    await expect(nestedRoleInput).toBeVisible();
    await expect(nestedRoleInput).toHaveValue('Chief Validation Executive'); // 刚才第 4 步修改的值被读取出来！

    // 删除 Workflow Node 清理测试遗留
    const deleteWorkflowNodeBtn = page.getByRole('button', { name: 'Delete Workflow Node' });
    await expect(deleteWorkflowNodeBtn).toBeVisible();
    await deleteWorkflowNodeBtn.click();

    // ==========================================
    // 8. 摧毁并全面清除整个测试 Workspace
    // ==========================================
    const deleteWorkspaceBtn = page.getByRole('button', { name: 'Delete workspace' });
    await expect(deleteWorkspaceBtn).toBeVisible();
    await deleteWorkspaceBtn.click();

    await page.waitForURL('/');
    await expect(page.getByText(testWorkspaceKey)).not.toBeVisible();
  });
});

function schemaVersionVersionLabelCheck(page: any) {
  return page.getByLabel('Schema Version').isVisible();
}
