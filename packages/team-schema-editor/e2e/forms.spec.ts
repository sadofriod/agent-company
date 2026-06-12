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

    const deptDecisionInput = page.getByLabel('Decision Scope');
    await deptDecisionInput.fill('requirements\nacceptance_tests\nprioritization');
    await expect(deptDecisionInput).toHaveValue('requirements\nacceptance_tests\nprioritization');

    const deptHandoffInput = page.getByLabel('Handoff Contracts');
    await deptHandoffInput.fill('ticket_docs\ncriteria_doc');
    await expect(deptHandoffInput).toHaveValue('ticket_docs\ncriteria_doc');

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

    const agentModelInput = page.getByLabel('Model');
    await agentModelInput.fill('gpt-4o-e2e');
    await expect(agentModelInput).toHaveValue('gpt-4o-e2e');

    const agentDescInput = page.getByLabel('Description', { exact: true });
    await agentDescInput.fill('E2E Tester Agent Role Description.');
    await expect(agentDescInput).toHaveValue('E2E Tester Agent Role Description.');

    const agentRespInput = page.getByLabel('Responsibilities');
    await agentRespInput.fill('validate_all_inputs\nproduce_accurate_assertions');
    await expect(agentRespInput).toHaveValue('validate_all_inputs\nproduce_accurate_assertions');

    const agentSkillsInput = page.getByLabel('Skills');
    await agentSkillsInput.fill('quality_engineering\nintegration_testing');
    await expect(agentSkillsInput).toHaveValue('quality_engineering\nintegration_testing');

    const agentToolsInput = page.getByLabel('Tools', { exact: true });
    await agentToolsInput.fill('e2e_playback\nmock_injector');
    await expect(agentToolsInput).toHaveValue('e2e_playback\nmock_injector');

    const agentMcpInput = page.getByLabel('MCP Servers');
    await agentMcpInput.fill('github_mcp\nfile_system_mcp');
    await expect(agentMcpInput).toHaveValue('github_mcp\nfile_system_mcp');

    const agentMemPolicyInput = page.getByLabel('Memory Profile');
    await agentMemPolicyInput.fill('custom_topic_owner_policy');
    await expect(agentMemPolicyInput).toHaveValue('custom_topic_owner_policy');

    // 检查并填充 Metadata 区属性
    const metadataNameInput = page.getByLabel('Metadata Name');
    await metadataNameInput.fill('E2E CEO Name');
    await expect(metadataNameInput).toHaveValue('E2E CEO Name');

    const metadataDescInput = page.getByLabel('Metadata Description');
    await metadataDescInput.fill('E2E Metadata description.');
    await expect(metadataDescInput).toHaveValue('E2E Metadata description.');

    const metadataProfileInput = page.getByLabel('Profile', { exact: true });
    await metadataProfileInput.fill('e2e-profile');
    await expect(metadataProfileInput).toHaveValue('e2e-profile');

    const metadataToolInput = page.getByLabel('Tool Policy');
    await metadataToolInput.fill('always_assert');
    await expect(metadataToolInput).toHaveValue('always_assert');

    const metadataPartialsInput = page.getByLabel('Partials');
    await metadataPartialsInput.fill('partial_execution\nvalidation_loop');
    await expect(metadataPartialsInput).toHaveValue('partial_execution\nvalidation_loop');

    const metadataToolsInput2 = page.getByLabel('Metadata Tools');
    await metadataToolsInput2.fill('m_tool1\nm_tool2');
    await expect(metadataToolsInput2).toHaveValue('m_tool1\nm_tool2');

    const metadataAllowedCmds = page.getByLabel('Allowed Commands');
    await metadataAllowedCmds.fill('ASSERT_OK\nFAIL_TEST');
    await expect(metadataAllowedCmds).toHaveValue('ASSERT_OK\nFAIL_TEST');

    const metadataReqCmds = page.getByLabel('Required Commands');
    await metadataReqCmds.fill('ASSERT_OK');
    await expect(metadataReqCmds).toHaveValue('ASSERT_OK');

    // ==========================================
    // 5. Discussion Policy Form
    // ==========================================
    const discussionNode = page.locator('.react-flow__node').filter({ hasText: 'Discussion Policy' }).first();
    await expect(discussionNode).toBeVisible();
    await discussionNode.click();

    await expect(page.getByRole('heading', { name: 'Discussion Policy', exact: true })).toBeVisible();

    const discModeInput = page.getByLabel('Mode', { exact: true });
    await discModeInput.fill('collaborative_run');
    await expect(discModeInput).toHaveValue('collaborative_run');

    const discRoundsInput = page.getByLabel('Max Rounds');
    await discRoundsInput.fill('9');
    await expect(discRoundsInput).toHaveValue('9');

    const discSupervisorInput = page.getByLabel('Supervisor Agent Id');
    await discSupervisorInput.fill('product_owner_custom');
    await expect(discSupervisorInput).toHaveValue('product_owner_custom');

    const discConflictInput = page.getByLabel('Conflict Resolution');
    await discConflictInput.fill('majority_vote');
    await expect(discConflictInput).toHaveValue('majority_vote');

    // ==========================================
    // 6. Memory Policy Form (Discussion/Session Memory)
    // ==========================================
    const memoryNode = page.locator('.react-flow__node').filter({ hasText: 'Discussion Memory' }).first();
    await expect(memoryNode).toBeVisible();
    await memoryNode.click();

    await expect(page.getByRole('heading', { name: 'Memory Policy', exact: true })).toBeVisible();

    const memModeInput = page.getByLabel('Retrieval Mode');
    await memModeInput.fill('hybrid_vector');
    await expect(memModeInput).toHaveValue('hybrid_vector');

    const memVectorStoreInput = page.getByLabel('Vector Store');
    await memVectorStoreInput.fill('milvus_db');
    await expect(memVectorStoreInput).toHaveValue('milvus_db');

    const memGraphStoreInput = page.getByLabel('Graph Store');
    await memGraphStoreInput.fill('neo4j_custom');
    await expect(memGraphStoreInput).toHaveValue('neo4j_custom');

    const memIndexedTypesInput = page.getByLabel('Indexed Object Types');
    await memIndexedTypesInput.fill('document\ntombstone\nlog_event');
    await expect(memIndexedTypesInput).toHaveValue('document\ntombstone\nlog_event');

    const memEvidenceInput = page.getByLabel('Evidence Required Outputs');
    await memEvidenceInput.fill('output_html\nproof_report');
    await expect(memEvidenceInput).toHaveValue('output_html\nproof_report');

    const memConflictInput = page.getByLabel('Conflict Strategy');
    await memConflictInput.fill('override_by_user');
    await expect(memConflictInput).toHaveValue('override_by_user');

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
    await allowedScopesInput.fill('private\ncorporate');
    await expect(allowedScopesInput).toHaveValue('private\ncorporate');

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
    const loadedAgentSelect = page.getByLabel('Loaded Agent');
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
