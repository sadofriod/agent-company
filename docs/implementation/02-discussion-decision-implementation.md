# Discussion And Decision Implementation

## 实现目标

Discussion And Decision 模块在任务尚不能直接执行时，根据 Team Schema 的讨论拓扑收敛目标、Owner、约束、Decision 和 Ticket Draft。它的输出必须是可审查的结构化对象，而不是自由文本结论。

## 源文档

- [../requirements/02-discussion-decision-requirements.md](../requirements/02-discussion-decision-requirements.md)
- [../PRDs/04-work-modes-and-pipeline.md](../PRDs/04-work-modes-and-pipeline.md)
- [../PRDs/02-domain-architecture.md](../PRDs/02-domain-architecture.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)

## 责任边界

本模块负责判断是否需要讨论、执行三种讨论拓扑、生成 Topic、Decision 和 Ticket Draft，并识别冲突与未决项。Ticket 准入放行由 Review Gate 完成，Pipeline 执行由 Ticket And Pipeline 模块完成。

针对 UI，本模块还需要输出可被编辑模式消费的讨论拓扑定义，包括节点、连线、参与角色和交接关系，但不负责具体前端渲染。

## 推荐文件

```text
src/domain/delivery.ts
src/domain/runtime.ts
src/runtime/routeWorkMode.ts
src/runtime/executeDiscussion.ts
src/runtime/executeSupervisorLedDiscussion.ts
src/runtime/executeSequentialHandoffDiscussion.ts
src/runtime/executeParallelReviewDiscussion.ts
src/ports/llmPort.ts
```

## 核心类型

- `Topic`：讨论的问题域，包含目标、约束、参与部门和预期输出。
- `Decision`：冻结的结构化判断，包含 Owner、结论、理由和来源引用。
- `TicketDraft`：待准入审查的可执行事项草案。
- `DiscussionTurn`：一次 Agent 参与讨论的输入、输出和证据引用。
- `DiscussionResult`：讨论输出集合，包含 Topic、Decision、Ticket Draft、冲突和未决项。
- `DiscussionFlowGraph`：供编辑模式使用的讨论拓扑投影，包含节点、边和可编辑元数据。

## 进入条件

`routeWorkMode` 在以下情况返回讨论模式：用户目标不清晰、成功标准不完整、Owner 不唯一、存在跨部门决策、依赖冲突、Ticket 尚不满足单一目标或可验收条件。

## 核心流程

1. Runtime 根据 WorkModeDecision 进入 `executeDiscussion`。
2. 模块从 RuntimePlan 读取 DiscussionPolicy、部门和 Agent 索引。
3. 根据参与者的 memory profile 调用 MemoryRetriever 获取已授权证据包。
4. 根据 `discussion_policy.mode` 分派到三种拓扑实现。
5. 每一轮产出结构化 DiscussionTurn，并写入审计事件。
6. 达到收敛条件时生成 Topic、Decision 和一个或多个 TicketDraft。
7. 达到 `max_rounds` 仍未收敛时输出冲突点、未决项和推荐裁决人。
8. 生成的 TicketDraft 交给 Review Gate 做准入审查。

编辑模式可直接消费 `DiscussionPolicy` 与 `DiscussionFlowGraph` 的映射结果，对讨论节点顺序、参与角色和交接关系做拖拽编辑；保存前仍应复用本模块的结构校验规则。

## 拓扑实现

`supervisor_led` 由 Supervisor 选择参与部门、组织轮次、裁决冲突并冻结 Decision。适合跨部门和高不确定性任务。

`sequential_handoff` 按 Schema 解析出的 Agent 顺序接力，每个 Agent 只消费上游 Handoff，并产出下游需要的结构化 Handoff。

`parallel_review` 并行收集多个 Agent 意见，再由 Owner 或 Supervisor 聚合为 Decision 和 TicketDraft。

## 输出要求

Decision 必须包含 Owner、结论、理由和来源引用。由历史记忆支撑的 Decision 必须携带 `retrieved_memory_ids` 或等价证据引用。一个 Topic 产生多个执行事项时，必须拆成多个 TicketDraft。

## 失败与回退

缺少必要上下文时返回 `review_revise` 候选结果，指向最近责任 Owner。Owner 冲突或边界冲突不得静默选择一方，应返回冲突对象并等待 Supervisor 或 Review Gate 裁决。达到最大轮次后返回 `discussion_max_rounds_reached`。

## 测试建议

- 同一任务分别使用 `supervisor_led`、`sequential_handoff` 和 `parallel_review`。
- 验证三种拓扑都能产出 Topic、Decision 和 TicketDraft。
- 构造 Owner 冲突，确认不会进入 Pipeline。
- 构造无限讨论，确认达到 `max_rounds` 后停止并输出未决项。
- 构造历史记忆支撑的 Decision，确认包含证据引用。
- 构造讨论拓扑编辑场景，确认拖拽修改后仍能还原为合法结构化讨论配置。
