# PRD Aligned E2E Spec

## 文档目标

本文档把 PRD 中的 MVP 业务约束转换为可执行的端到端测试规格，覆盖 Team Schema 编辑、运行时会话、讨论到 Pipeline 的状态流转、审查回退和记忆治理。

本规格面向两类 E2E：

- UI E2E：通过浏览器驱动验证编辑模式和执行模式的关键路径。
- API E2E：通过 HTTP 调用和状态查询验证服务端主流程、审计和回退。

## 源文档

- [../PRDs/PRD.md](../PRDs/PRD.md)
- [../PRDs/01-mvp-scope.md](../PRDs/01-mvp-scope.md)
- [../PRDs/03-json-schema-driven-loading.md](../PRDs/03-json-schema-driven-loading.md)
- [../PRDs/04-work-modes-and-pipeline.md](../PRDs/04-work-modes-and-pipeline.md)
- [../PRDs/05-memory-and-governance.md](../PRDs/05-memory-and-governance.md)
- [../PRDs/06-review-and-test-plan.md](../PRDs/06-review-and-test-plan.md)
- [../requirements/08-acceptance-test-requirements.md](../requirements/08-acceptance-test-requirements.md)
- [08-acceptance-test-implementation.md](08-acceptance-test-implementation.md)

## 测试范围

### In Scope

- Team Schema 动态加载与编辑结果保存。
- 三种讨论拓扑模式切换及输出对象一致性。
- 单 Ticket Pipeline 的 DAG 约束、步骤状态和中断回退。
- Review Gate 的 `pass`、`revise`、`block` 分支行为。
- 记忆检索治理、证据字段和冲突处理。
- 能力加载审计与失败原因可追溯。

### Out Of Scope

- 大规模真实 LLM 评测和模型效果对比。
- 生产级高并发与压测。
- 多 Pipeline 共享可变执行状态。

## 环境与约束

- 前端：Playwright，基于 `packages/team-schema-editor/playwright.config.ts`。
- 服务端：本地 dev 服务，使用稳定的测试 schema fixture。
- 数据层：建议使用独立测试库或隔离 schema key，确保用例可重复执行。
- 每条用例必须带有可断言的审计事件或结构化状态，避免只断言文案。

### LM Studio 模型能力（E2E 默认）

E2E 运行前通过 Playwright global setup 写入本地网关配置，默认使用 LM Studio（OpenAI-compatible）作为模型能力来源。

- Provider：`lmstudio`
- API Format：`openai_chat`
- 默认 Base URL：`http://localhost:1234/v1`
- 默认模型：`google/gemma-4-12b`（建议在运行时通过环境变量覆盖）

可用环境变量：

- `E2E_LMSTUDIO_PROVIDER`
- `E2E_LMSTUDIO_BASE_URL`
- `E2E_LMSTUDIO_MODEL`
- `E2E_LMSTUDIO_API_FORMAT`
- `E2E_LMSTUDIO_API_KEY`
- `E2E_LMSTUDIO_NAME`

建议执行命令：

```bash
pnpm --filter @agents-team/team-schema-editor test:e2e:lmstudio
```

若本地 LM Studio 使用了不同端口或模型名称，请在命令前覆盖环境变量。

## 测试数据约定

使用以下 Team Schema fixture（名称可按项目代码命名）：

- `single-department-team.json`
- `software-delivery-team.json`
- `five-departments-team.json`
- `invalid-owner-conflict-team.json`
- `invalid-discussion-mode-team.json`

使用以下 Pipeline fixture：

- `pipeline-valid-dag.json`
- `pipeline-cycle.json`
- `pipeline-missing-required-field.json`
- `pipeline-capability-missing.json`

使用以下 Memory fixture：

- `memory-reviewed.json`
- `memory-unreviewed-conflict.json`
- `memory-expired.json`
- `memory-unauthorized-scope.json`

## E2E 场景矩阵

| E2E ID | 场景 | 关联 PRD | Given | When | Then |
| --- | --- | --- | --- | --- | --- |
| E2E-001 | Dynamic Department Loading | MVP Scope, TEST-001 | 提供 1/2/5 部门 schema | 分别加载到 workspace | UI 节点数量与部门映射正确，运行时装配成功 |
| E2E-002 | Discussion Topology Switch | Work Modes, TEST-001 | 同一任务输入 + 三种 `discussion_policy.mode` | 分别触发运行 | 均输出 Topic/Decision/Ticket Draft，拓扑与 mode 一致 |
| E2E-003 | Edit Mode Guardrails | Work Modes UI 联动约束 | 在编辑模式修改流程 | 保存并提交 | 若违反唯一 Owner 或 DAG 约束则阻止提交并提示原因 |
| E2E-004 | Runtime View Projection | Work Modes 执行模式 | 已有运行会话 | 打开执行模式并切换节点 | 可查看输入、输出、Handoff、ReviewResult、状态流转 |
| E2E-005 | Handoff Field Missing | Review/Test Plan | 上游输出缺少必填字段 | 下游消费并触发审查 | Quality Review 返回 `revise`，责任主体可定位 |
| E2E-006 | Owner Conflict Block | Review/Test Plan, TEST-005 | 同一 Ticket 两个 Owner | 触发 ticket admission | Logic Review 返回 `block`，Pipeline 不启动 |
| E2E-007 | Pipeline Cycle Reject | MVP Scope, TEST-003 | 存在环依赖 pipeline | 尝试启动执行 | DAG 校验失败，状态停留在准入前 |
| E2E-008 | Capability Missing Interrupt | MVP Scope, TEST-004 | 步骤需要未授权 Tool | 运行到目标步骤 | 步骤中断并返回 `capability_missing`，记录审计事件 |
| E2E-009 | Memory Scope Pollution Prevented | Memory/Governance | Step Executor 尝试写 system memory | 提交写入请求 | 治理拒绝写入并要求提升审查 |
| E2E-010 | RAG Evidence Required | Memory/Governance, TEST-006 | 输出引用历史记忆但缺证据字段 | 提交审查 | Quality Review 返回 `revise`，要求补齐 `retrieved_memory_ids` 或 `source_refs` |
| E2E-011 | Memory Conflict Escalation | Memory/Governance | 检索到冲突记忆 | 进入 Review Gate | 标记 `memory_conflict` 并 `block` 或升级 Supervisor |
| E2E-012 | Unauthorized Retrieval Denied | Memory/Governance | Executor 请求越权 scope | 发起检索 | 检索前治理过滤拒绝，审计记录拒绝原因 |
| E2E-013 | Infinite Discussion Loop Stop | Work Modes, Review/Test Plan | 讨论反复修订无收敛 | 达到 `max_rounds` | 讨论终止，输出冲突点/未决项/推荐裁决人 |

## 关键断言规范

### 通用断言

- 结构化对象断言优先于文本断言：至少断言对象 ID、状态、owner、依赖和审查结果。
- 所有失败路径必须断言错误码或状态枚举，避免仅断言 HTTP 状态码。
- 每个场景至少断言一条审计事件，包含 `event_type`、`target_id`、`reason`。

### UI E2E 断言

- 编辑模式：节点/边变化与表单字段变化双向一致。
- 执行模式：节点状态从待执行到终态变化可见且可追溯。
- 禁止绕过：未通过 Review Gate 的对象不得在 UI 显示为可执行。

### API E2E 断言

- `/team/validate` 返回 schema 与引用校验结果。
- `/runtime-plan` 反映 team 装配结果与讨论/审查策略。
- `/runtime` 相关接口返回会话状态、执行阶段和审计信息。

## 推荐目录与命名

```text
packages/team-schema-editor/e2e/
  e2e-schema-loading.spec.ts
  e2e-discussion-modes.spec.ts
  e2e-edit-mode-guardrails.spec.ts
  e2e-runtime-view.spec.ts
  e2e-review-gate.spec.ts

packages/service/src/tests/e2e/
  e2e-runtime-discussion-to-pipeline.test.ts
  e2e-pipeline-interruptions.test.ts
  e2e-memory-governance.test.ts
  e2e-capability-audit.test.ts
```

命名建议：`E2E-xxx <short-case-name>`，并在测试描述中保留 PRD 映射编号，例如 `TEST-005`。

## 执行与放行

### 最小执行集（PR 阶段）

- E2E-001, E2E-003, E2E-006, E2E-007, E2E-008, E2E-010

### 全量执行集（发布前）

- E2E-001 到 E2E-013 全部通过

### 放行门槛

- 不允许存在 `block` 场景被错误放行。
- 不允许存在越权检索或越权能力调用未被审计捕获。
- 不允许存在无法回溯证据来源的 Decision、Ticket、Handoff、ReviewResult。

## 追踪关系

| PRD/Requirement | E2E 覆盖 |
| --- | --- |
| TEST-001 | E2E-001, E2E-002 |
| TEST-002 | E2E-003, E2E-005 |
| TEST-003 | E2E-007 |
| TEST-004 | E2E-008 |
| TEST-005 | E2E-006, E2E-007, E2E-010 |
| TEST-006 | E2E-010, E2E-011, E2E-012 |

## 风险与缓解

- 风险：E2E 过度依赖 UI 文案导致脆弱。
  缓解：优先断言结构化状态与可访问角色选择器。

- 风险：外部依赖不稳定导致偶发失败。
  缓解：对 LLM、向量检索、工具执行使用可控 mock 或固定 fixture。

- 风险：测试数据污染导致结果不可重复。
  缓解：每次运行使用独立 workspace key，并在 teardown 清理。