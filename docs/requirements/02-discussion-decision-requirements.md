# Discussion And Decision Requirements

## 模块目标

Discussion And Decision 模块负责在任务尚不能直接执行时，按 Team Schema 指定的讨论拓扑收敛目标、责任边界、约束、Decision 和 Ticket 草案。

## 范围

本模块包含：

- 工作是否进入讨论模式的判断。
- `supervisor_led`、`sequential_handoff`、`parallel_review` 三种拓扑执行。
- Topic、Subtopic、Decision、Ticket Draft 的结构化生成。
- 冲突识别、轮次控制和退出条件。
- 面向讨论拓扑的可视化编辑数据模型输出。

本模块不负责：

- Ticket 准入审查的最终放行。
- Pipeline DAG 执行。
- 绕过 MemoryRetriever 读取历史上下文。

## 输入

- 用户原始任务。
- RuntimePlan。
- DiscussionPolicy。
- 已授权 MemoryRetriever 返回的上下文包。

## 输出

- `Topic`。
- `Decision`。
- `TicketDraft`。
- 未决冲突列表。
- 讨论审计事件。

## 功能需求

- `DISC-001`：当用户目标、成功标准、Owner 或依赖不清晰时，系统必须进入讨论模式。
- `DISC-002`：讨论拓扑必须由 `discussion_policy.mode` 决定，不允许 Agent 在运行中临时改变。
- `DISC-003`：`supervisor_led` 模式必须由 Supervisor 负责路由、裁决冲突并冻结 Decision。
- `DISC-004`：`sequential_handoff` 模式必须按 Schema 声明顺序接力，每个 Agent 只消费上游 Handoff。
- `DISC-005`：`parallel_review` 模式必须支持多个 Agent 并行给出意见，再由 Owner 或 Supervisor 聚合。
- `DISC-006`：讨论必须遵守 `max_rounds`，达到最大轮次后输出冲突点、未决项和推荐裁决人。
- `DISC-007`：讨论输出必须至少能覆盖 Schema 声明的 `required_outputs`。
- `DISC-008`：Decision 必须包含 Owner、结论、理由和来源引用。
- `DISC-009`：由历史记忆支撑的 Decision 必须携带 `retrieved_memory_ids` 或等价证据引用。
- `DISC-010`：一个 Topic 若产生多个执行事项，必须拆分为多个 Ticket Draft。
- `DISC-011`：每个 Ticket Draft 必须具备单一目标、候选 Owner、验收标准和失败处理草案。
- `DISC-012`：发现 Owner 冲突或跨部门边界冲突时，必须进入冲突处理，不得静默选择一方。
- `DISC-013`：系统必须提供可被编辑模式消费的讨论拓扑结构，支持节点、连线、参与角色和交接关系的可视化编辑。
- `DISC-014`：编辑模式对讨论拓扑的修改必须回写为结构化配置，不得保存为不可校验的自由文本。
- `DISC-015`：编辑模式保存讨论拓扑前，必须至少校验参与角色合法性、连线完整性和退出条件可达性。

## 业务规则

- 讨论模式的目标是生成可审查的结构化对象，不是无限协商。
- Decision 冻结后才能驱动 Ticket 创建或 Pipeline 执行。
- Review Agent 不能替代 Owner 做业务决策，只能判断对象是否能进入下游。

## 失败与回退

- 缺少必要上下文：返回 `revise` 建议并指向最近责任 Owner。
- 达到最大讨论轮次：输出未决项并交给 Supervisor 或 Owner 裁决。
- 记忆冲突无法解决：交由 Review Gate 或 Supervisor 处理。

## 验收标准

- 同一用户任务可以根据不同 `discussion_policy.mode` 走不同讨论拓扑。
- 三种拓扑均能产出 Topic、Decision 和 Ticket Draft。
- 无限讨论在达到 `max_rounds` 后停止。
- Owner 冲突不会进入 Pipeline。
- 讨论拓扑可以被可视化编辑，并且编辑结果仍满足既有讨论模式约束。