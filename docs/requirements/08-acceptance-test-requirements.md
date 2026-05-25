# Acceptance And Test Requirements

## 模块目标

Acceptance And Test 模块定义 MVP 必须通过的验收条件和测试场景，用于判断 Schema-driven Agent Team Runtime 是否达到可实现、可审查、可回退的最低产品标准。

## MVP 总体验收

- `TEST-001`：更换 Team Schema 后，不改运行时代码即可改变部门数量、Agent 阵容和讨论方式。
- `TEST-002`：每个 Ticket 都有唯一 Owner、明确输入输出、验收标准和失败处理。
- `TEST-003`：每个 Pipeline 都只服务于一个 Ticket，并且能被校验为 DAG。
- `TEST-004`：Agent、Skill、MCP 和 Tool 的加载理由可追踪、可撤销、可复盘。
- `TEST-005`：Review Gate 能阻止 Owner 冲突、字段缺失、循环依赖、能力越权和缺少证据支撑的记忆引用。
- `TEST-006`：基于记忆生成的结论可以追溯到被召回的 MemoryObject 或原始结构化对象。

## 测试场景

### Dynamic Department Loading

输入包含 1 个部门、2 个部门和 5 个部门的 Team Schema。

预期：运行时不改代码即可加载不同部门数量，并正确解析 Agent 与部门关系。

### Discussion Topology Switch

对同一任务分别使用 `supervisor_led`、`sequential_handoff` 和 `parallel_review`。

预期：系统按 Schema 改变讨论方式，并产出相同类型的结构化对象。

### Handoff Field Missing

上游 Agent 输出缺少必填字段。

预期：Quality Review 返回 `revise`，并指向最近责任上游。

### Owner Conflict

两个部门同时声明同一 Ticket 的 Owner 权。

预期：Logic Review 返回 `block`，要求 Supervisor 或 DiscussionPolicy 裁决。

### Pipeline Cycle

Pipeline Step A 依赖 Step B，Step B 又依赖 Step A。

预期：DAG 校验失败，Pipeline 不得启动。

### Capability Missing

步骤需要某个 Tool，但 Schema 未授权或运行时不存在该 Tool。

预期：步骤中断并输出 `capability_missing`，不得让 Agent 编造外部结果。

### Memory Scope Pollution

Step Executor 尝试把 Ticket 级执行经验直接写入 System Memory。

预期：治理策略拒绝写入，并要求走提升审查。

### RAG Evidence Missing

Agent 基于历史记忆创建 Decision 或 Ticket，但输出没有记录 `retrieved_memory_ids` 或来源对象。

预期：Quality Review 返回 `revise`，要求补充证据引用后重审。

### Memory Conflict Retrieved

MemoryRetriever 召回两条相互冲突的已授权记忆。

预期：运行时标记 `memory_conflict`，Review Gate 返回 `block` 或要求 Supervisor 裁决。

### Unauthorized Memory Retrieval

Pipeline Step Executor 试图通过语义检索读取无关 Topic Memory 或其他 Ticket Memory。

预期：治理过滤在向量检索前拒绝该范围，审计事件记录被拒绝的读取请求。

### Infinite Discussion Loop

多个 Agent 在讨论中持续互相要求修改。

预期：达到 `max_rounds` 后停止讨论，输出冲突点、未决项和推荐裁决人。

## 模块覆盖矩阵

| 测试场景 | 覆盖模块 |
| --- | --- |
| Dynamic Department Loading | Organization And Schema |
| Discussion Topology Switch | Discussion And Decision |
| Handoff Field Missing | Ticket And Pipeline, Review And Governance |
| Owner Conflict | Discussion And Decision, Review And Governance |
| Pipeline Cycle | Ticket And Pipeline, Review And Governance |
| Capability Missing | Capability Loading, Runtime And Audit |
| Memory Scope Pollution | Memory And RAG, Review And Governance |
| RAG Evidence Missing | Memory And RAG, Review And Governance |
| Memory Conflict Retrieved | Memory And RAG, Runtime And Audit |
| Unauthorized Memory Retrieval | Memory And RAG, Runtime And Audit |
| Infinite Discussion Loop | Discussion And Decision, Runtime And Audit |

## MVP 放行标准

- Schema 校验可以捕获缺少部门、Agent 引用错误、非法讨论模式和非法审查结果。
- Runtime 可以根据不同 Schema 改变部门数量和讨论方式。
- Ticket 准入审查可以阻止 Owner 冲突、字段缺失和不可执行 Ticket。
- Pipeline DAG 校验可以阻止循环依赖。
- 能力加载审计可以解释每次 Agent、Skill、MCP 和 Tool 的加载原因。
- 记忆检索结果可以解释召回理由、来源对象、审查状态和冲突标记。