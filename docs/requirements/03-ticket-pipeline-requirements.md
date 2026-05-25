# Ticket And Pipeline Requirements

## 模块目标

Ticket And Pipeline 模块负责把通过准入审查的单个 Ticket 转换为可执行、可恢复、可审计的 Pipeline DAG，并按步骤执行、交接和回退。

## 范围

本模块包含：

- Ticket 准入条件检查。
- 单 Ticket 单 Pipeline 创建。
- Pipeline Step DAG 校验。
- Step 输入输出、Owner、能力边界和失败策略管理。
- Handoff 生成和步骤级审查触发。

本模块不负责：

- 讨论模式中的业务裁决。
- 未授权 Tool 的直接加载。
- 系统级记忆提升。

## 输入

- 已通过准入审查的 Ticket。
- PipelinePolicy。
- AgentDefinition。
- CapabilityPolicy 或 Agent 能力声明。
- 已授权 MemoryRetriever 返回的上下文包。

## 输出

- `Pipeline`。
- `PipelineStep` 执行结果。
- `Handoff`。
- `PipelineInterruption`。
- Pipeline 审计事件。

## 功能需求

- `PIPE-001`：MVP 必须保证一个 Pipeline 只执行一个 Ticket。
- `PIPE-002`：Ticket 必须有唯一 `ticket_id` 和唯一 Owner。
- `PIPE-003`：Ticket 必须具备目标、输入契约、输出契约、验收标准和失败处理。
- `PIPE-004`：Pipeline 步骤必须能表示为 DAG。
- `PIPE-005`：每个 Pipeline Step 必须有唯一 `step_id` 和唯一 `owner_agent_id`。
- `PIPE-006`：每个 Step 必须声明 `depends_on`、`input_contract`、`output_contract`、`allowed_capabilities`、`timeout_policy`、`failure_policy` 和 `review_required`。
- `PIPE-007`：Pipeline 启动前必须校验循环依赖，存在环时不得启动。
- `PIPE-008`：Step 只能加载当前 Agent、当前步骤和当前 Schema 均允许的能力。
- `PIPE-009`：Step 输出进入下游前必须生成结构化 Handoff。
- `PIPE-010`：当 `review_before_handoff` 为 `true` 时，Handoff 必须先经过 Review Gate。
- `PIPE-011`：上游输出缺少关键字段时，当前步骤必须中断并返回 `revise_upstream`。
- `PIPE-012`：当前步骤需要未授权或不存在能力时，必须中断并返回 `capability_missing`。
- `PIPE-013`：当前步骤发现 Ticket 边界错误、Owner 不唯一或新增跨部门决策时，必须回退到讨论模式。

## Pipeline Step 最小字段

- `step_id`
- `ticket_id`
- `owner_agent_id`
- `depends_on`
- `input_contract`
- `output_contract`
- `allowed_capabilities`
- `timeout_policy`
- `failure_policy`
- `review_required`

## 中断动作

- `revise_upstream`：退回最近责任上游补充字段或修正质量。
- `reload_capability`：在 Schema 允许范围内重新装配能力。
- `return_to_discussion`：回退到讨论模式重建 Decision 或 Ticket。

## 验收标准

- 字段缺失、循环依赖或能力缺失会阻止 Pipeline 继续执行。
- 每个跨步骤或跨部门交接都有结构化 Handoff。
- Step Executor 不能读取或写入超出当前步骤需要的上下文。
- Pipeline 失败时能给出明确中断原因和建议动作。