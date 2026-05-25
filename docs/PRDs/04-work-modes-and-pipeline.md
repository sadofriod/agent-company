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
