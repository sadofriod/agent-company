# Work Modes And Pipeline

## 讨论模式

讨论模式用于收敛问题、澄清目标、确定责任边界和生成可执行 Ticket。

进入讨论模式的条件：

- 用户任务目标不清晰。
- 成功标准不完整。
- 涉及多个部门共同决策。
- 存在依赖冲突或 Owner 冲突。
- 当前事项尚不能拆解为单一目标、单一 Owner、可验收 Ticket。

讨论模式的输出：

- Topic
- Subtopic
- Decision
- Owner department
- Collaborating departments
- Constraints
- Acceptance criteria
- Ticket draft

讨论拓扑由 Team Schema 的 `discussion_policy.mode` 决定。

## 讨论拓扑

### supervisor_led

Supervisor 负责识别任务类型、选择参与部门、组织讨论、裁决冲突并冻结 Decision。适合跨部门、高不确定性任务。

### sequential_handoff

Agent 按 Schema 声明的顺序接力处理，每个 Agent 只消费上游 Handoff 并产出下游 Handoff。适合流程稳定的任务。

### parallel_review

多个 Agent 并行给出审查意见，Owner 或 Supervisor 聚合结论。适合需要多专家判断但不需要多轮协商的任务。

## UI 模式

系统 UI 至少支持两种视图模式，并且都基于同一套结构化 Topic、Decision、Ticket、Pipeline、Handoff 和 AuditEvent 数据驱动。

### 编辑模式

编辑模式用于配置和调整讨论流程与 Pipeline 结构。前端应基于 [React Flow](https://reactflow.dev/) 提供 workflow 编辑器，支持以拖拽方式编辑节点、连线、分支和依赖关系。

编辑模式至少支持：

- 编辑讨论拓扑中的节点顺序、参与角色和交接关系。
- 编辑 Pipeline DAG 中的 Step、依赖、Owner 和基础契约字段。
- 在保存前执行基础结构校验，至少覆盖唯一 Owner、依赖存在性和 DAG 合法性。
- 将编辑结果映射回结构化定义，而不是自由文本配置。

### 执行模式

执行模式用于展示讨论流程和 Pipeline 的实时或可回放执行状态。

执行模式至少支持：

- 以流程图方式展示讨论节点和 Pipeline Step 的当前状态。
- 按节点查看每一步的输入、输出、Handoff、ReviewResult 和日志摘要。
- 展示步骤级状态变化，包括待执行、执行中、通过、修订、中断和阻塞。
- 基于审计事件复盘一次执行从讨论到 Pipeline 的完整路径。

## Pipeline 模式

Pipeline 模式用于执行单个已经定义清楚的 Ticket。

使用 Pipeline 模式的条件：

- Ticket 目标清晰。
- Ticket 有唯一 Owner。
- 输入输出字段稳定。
- 验收标准可验证。
- 失败处理明确。
- 执行步骤可以组织为 DAG。
- Ticket 已通过准入逻辑审查和质量审查。

## Pipeline Step

每个步骤至少包含：

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

## 模式切换

讨论模式进入 Pipeline 模式的条件：

- 至少一个 Decision 已形成。
- 每个执行事项已经落为 Ticket。
- 每个 Ticket 只有一个直接 Owner。
- Ticket 的输入、输出、依赖、验收标准、失败处理明确。
- Ticket 内部步骤可以组成 DAG。
- Ticket 已通过准入审查。

Pipeline 回退到讨论模式的条件：

- Ticket 边界错误。
- Owner 不唯一。
- 验收标准失效。
- 需要新增跨部门决策。
- Pipeline 无法保持 DAG。
- 能力缺口无法在当前 Schema 下解决。
- Logic Review 返回 `block`。

## 中断处理

Pipeline 执行中出现以下情况必须中断：

- 上游输出缺少关键字段。
- 当前步骤发现输入与 Ticket 目标冲突。
- 当前步骤需要未授权能力。
- 当前步骤生成新的跨部门依赖。
- 当前步骤会导致循环依赖。

中断后允许三种动作：

- `revise_upstream`：退回最近责任上游补充字段或修正质量。
- `reload_capability`：在 Schema 允许范围内重新装配能力。
- `return_to_discussion`：回退到讨论模式重建 Decision 或 Ticket。

## UI 与模式联动约束

- 编辑模式不得绕过既有讨论模式、Review Gate 和 Pipeline 准入规则直接放行未审查对象。
- 执行模式是运行时状态和审计事件的可视化投影，不得成为独立事实来源。
- 编辑模式提交的流程定义必须继续满足单 Ticket Pipeline、唯一 Owner 和 DAG 约束。
