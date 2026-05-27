# Organization And Schema Implementation

## 实现目标

Organization And Schema 模块把外部 Team Schema JSON 转换为运行时可执行的不可变 RuntimePlan。它是所有后续模块的入口，必须先保证字段形状、引用完整性、策略枚举和默认策略都可解释。

## 源文档

- [../requirements/01-organization-schema-requirements.md](../requirements/01-organization-schema-requirements.md)
- [../PRDs/03-json-schema-driven-loading.md](../PRDs/03-json-schema-driven-loading.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)
- [../schemas/team.schema.json](../schemas/team.schema.json)

## 责任边界

本模块负责读取、校验、解析和冻结组织计划，不负责执行讨论、Pipeline Step、LLM 调用、Tool 调用或记忆检索。

实现时保持四个阶段分离：原始 JSON 读取、JSON Schema 校验、跨字段业务校验、RuntimePlan 创建。每个阶段都返回结构化结果，避免把错误压成普通字符串。

## 推荐文件

```text
src/domain/organization.ts
src/domain/runtime.ts
src/schema/loadTeamSchema.ts
src/schema/validateTeamSchema.ts
src/schema/validateTeamReferences.ts
src/runtime/createRuntimePlan.ts
src/ports/auditPort.ts
```

## 核心类型

- `TeamDefinition`：Schema 解析后的团队定义，包含部门、Agent 和策略对象。
- `Department`：业务责任边界，包含决策范围、Agent 引用和 Handoff 契约。
- `AgentDefinition`：Agent 的职责、模型、输入输出契约和声明能力。
- `AgentDefinition.metadata` / `AgentDefinition.description`：从 Team Schema JSON 动态读取 Agent 元数据与详细描述，供运行时路由、展示和治理使用。
- `SchemaIssue`：校验问题，包含 `code`、`path` 和 `message`。
- `ValidationResult<T>`：所有校验函数统一返回的成功或失败联合类型。
- `RuntimePlan`：冻结后的执行计划，包含 ID 索引和策略引用。

## 核心流程

1. `loadTeamSchema` 读取 JSON，并把外部输入保留为 `unknown`。
2. `loadTeamSchema` 使用 Zod schema 校验字段形状并完成 snake_case 到领域模型的转换。
3. `validateTeamReferences` 校验 Department、Agent、Supervisor 和 Memory Profile 的引用完整性。
4. 解析每个 Agent 的 `metadata` 和 `description`，并与基础组织字段一起装配为 `AgentDefinition`。
5. `createRuntimePlan` 构建 `departmentsById`、`agentsById` 和策略对象索引。
6. RuntimePlan 冻结后返回给 Runtime，后续任务只能基于它创建 ExecutionContext。
7. 每个阶段写入审计事件，失败时停止装配并返回结构化错误。

## 关键校验规则

- Department 至少包含一个 Agent 引用。
- Agent 的 `department_id` 必须引用已存在 Department。
- Department 中声明的 Agent ID 必须存在于顶层 `agents`。
- `discussion_policy.mode` 只能是 `supervisor_led`、`sequential_handoff` 或 `parallel_review`。
- `supervisor_agent_id` 存在时必须引用已声明 Agent。
- `pipeline_policy.one_pipeline_per_ticket` 和 `pipeline_policy.dag_required` 必须为 `true`。
- Agent 的 `memory_access_policy` 必须能解析到 Retrieval Profile，或使用显式默认 profile。
- `team_id`、`department_id` 和 `agent_id` 在各自范围内必须唯一。

## 错误与审计

错误优先使用 `schema_invalid` 和 `reference_invalid`。错误对象包含字段路径、错误代码、可读说明和建议动作。

审计事件至少记录 Schema 加载开始、Schema 校验结果、Department 解析结果、Agent 解析结果、引用完整性问题和 RuntimePlan 创建结果。

## 测试建议

- 使用 1 个、2 个和 5 个部门的 Schema 创建 RuntimePlan。
- 构造 Agent 引用不存在、Agent 指向未知部门、Supervisor 不存在的失败用例。
- 构造非法讨论模式和非法 Review 结果枚举。
- 使用 [../examples/software-delivery-team.json](../examples/software-delivery-team.json) 作为正向集成测试 fixture。
