# Organization And Schema Requirements

## 模块目标

Organization And Schema 模块负责把 Team Schema 装配为运行时可执行的组织计划。运行时不得硬编码部门数量、Agent 名称、讨论方式或能力边界。

## 范围

本模块包含：

- Team Schema 读取与基础 JSON Schema 校验。
- Department、Agent、DiscussionPolicy、PipelinePolicy、MemoryPolicy、ReviewPolicy 的解析。
- 跨字段引用完整性校验。
- RuntimePlan 的创建。

本模块不负责：

- 执行具体讨论。
- 执行 Pipeline 步骤。
- 直接调用 LLM、Tool、MCP 或外部存储。

## 输入

- Team Schema JSON。
- MVP Team Schema 校验规则。
- 可选的运行时默认策略，例如默认 Memory Retrieval Profile。

## 输出

- `TeamDefinition`。
- `RuntimePlan`。
- 结构化 `SchemaIssue[]`。
- Schema 加载审计事件。

## 功能需求

- `ORG-001`：系统必须支持从 Team Schema 动态读取一个或多个 Department。
- `ORG-002`：每个 Department 必须包含 `department_id`、`name`、`mission`、`decision_scope` 和至少一个 Agent 引用。
- `ORG-003`：系统必须支持从 Team Schema 动态读取一个或多个 Agent。
- `ORG-004`：每个 Agent 必须包含 `agent_id`、`department_id`、`role`、`model`、`responsibilities`、`input_contract` 和 `output_contract`。
- `ORG-005`：Agent 的 `department_id` 必须引用已存在的 Department。
- `ORG-006`：Department 中声明的 Agent ID 必须能在 `agents` 中解析。
- `ORG-007`：`discussion_policy.mode` 只允许 `supervisor_led`、`sequential_handoff`、`parallel_review`。
- `ORG-008`：当 `supervisor_agent_id` 存在时，必须引用已声明 Agent。
- `ORG-009`：`pipeline_policy.one_pipeline_per_ticket` 和 `pipeline_policy.dag_required` 必须为 `true`。
- `ORG-010`：当 Agent 声明 `memory_access_policy` 时，必须能解析到 `memory_policy.retrieval_profiles.profile_id`，或由运行时显式默认策略兜底。
- `ORG-011`：运行时计划创建后必须视为不可变；后续任务执行只能基于该计划创建独立执行上下文。
- `ORG-012`：Schema 校验失败时，系统必须返回字段路径、错误代码和可读说明，不得进入讨论或 Pipeline。

## 业务规则

- Team Schema 是组织装配的事实来源。
- 运行时不能在执行中发明未声明的部门、Agent 或讨论规则。
- JSON Schema 负责字段形状校验，跨字段业务规则由独立校验函数补充。

## 审计需求

- 记录 Team Schema 加载开始与结束。
- 记录每个 Department 和 Agent 的解析结果。
- 记录每个引用完整性错误。
- 记录 RuntimePlan 创建结果和策略摘要。

## 验收标准

- 使用 1 个、2 个和 5 个部门的 Team Schema 均可创建 RuntimePlan。
- Agent 引用不存在时，系统返回阻塞错误。
- 非法讨论模式无法通过校验。
- 更换 Team Schema 后，不修改运行时代码即可改变部门结构和 Agent 阵容。