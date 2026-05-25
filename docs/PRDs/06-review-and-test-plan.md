# Review And Test Plan

## 审查层目标

审查层用于判断结构化对象是否具备继续流转条件。它不替代 Owner 做业务判断，只判断对象是否自洽、完整、可消费和可复盘。

## 逻辑审查

逻辑审查回答：该对象是否应该进入下一步。

检查项：

- 目标与成功标准是否一致。
- Owner 是否唯一。
- 协作边界是否清晰。
- 输入输出是否闭合。
- Topic、Decision、Ticket、Pipeline 之间的推导链是否完整。
- Pipeline 是否保持 DAG。
- 冲突是否已裁决。
- 回退条件是否明确。

## 质量审查

质量审查回答：该对象现在交给下游是否会制造噪音或返工。

检查项：

- 必填字段是否完整。
- 字段命名、类型和枚举是否符合 Schema。
- 结论是否有证据支撑。
- 基于历史记忆的结论是否包含 `retrieved_memory_ids`、`source_refs` 或等价证据引用。
- 召回记忆是否存在过期、被替代、被 block 或冲突标记。
- 验收标准是否可操作。
- 失败处理是否明确。
- Handoff 是否足以让下游直接消费。
- 是否混入无关信息或不必要能力暴露。

## 审查结果

审查结果只允许三种：

- `pass`：允许进入下一步。
- `revise`：退回最近责任 Owner 修补后重审。
- `block`：存在结构性问题，必须回退到讨论模式或上游对象重建。

## 多 Agent 测试计划

### 1. Dynamic Department Loading

输入包含 1 个部门、2 个部门和 5 个部门的 Team Schema。

预期：运行时不改代码即可加载不同部门数量，并正确解析 Agent 与部门关系。

### 2. Discussion Topology Switch

对同一任务分别使用 `supervisor_led`、`sequential_handoff` 和 `parallel_review`。

预期：系统按 Schema 改变讨论方式，并产出相同类型的结构化对象。

### 3. Handoff Field Missing

上游 Agent 输出缺少必填字段。

预期：Quality Review 返回 `revise`，并指向最近责任上游。

### 4. Owner Conflict

两个部门同时声明同一 Ticket 的 Owner 权。

预期：Logic Review 返回 `block`，要求 Supervisor 或 DiscussionPolicy 裁决。

### 5. Pipeline Cycle

Pipeline Step A 依赖 Step B，Step B 又依赖 Step A。

预期：DAG 校验失败，Pipeline 不得启动。

### 6. Capability Missing

步骤需要某个 Tool，但 Schema 未授权或运行时不存在该 Tool。

预期：步骤中断并输出 `capability_missing`，不得让 Agent 编造外部结果。

### 7. Memory Scope Pollution

Step Executor 尝试把 Ticket 级执行经验直接写入 System Memory。

预期：治理策略拒绝写入，并要求走提升审查。

### 8. RAG Evidence Missing

Agent 基于历史记忆创建 Decision 或 Ticket，但输出没有记录 `retrieved_memory_ids` 或来源对象。

预期：Quality Review 返回 `revise`，要求补充证据引用后重审。

### 9. Memory Conflict Retrieved

MemoryRetriever 召回两条相互冲突的已授权记忆，例如旧 Decision 与新 Decision 对同一验收标准给出不同结论。

预期：运行时标记 `memory_conflict`，Review Gate 返回 `block` 或要求 Supervisor 裁决，不允许下游 Agent 静默选择。

### 10. Unauthorized Memory Retrieval

Pipeline Step Executor 试图通过语义检索读取无关 Topic Memory 或其他 Ticket Memory。

预期：治理过滤在向量检索前拒绝该范围，审计事件记录被拒绝的读取请求。

### 11. Infinite Discussion Loop

多个 Agent 在讨论中持续互相要求修改。

预期：达到 `max_rounds` 后停止讨论，输出冲突点、未决项和推荐裁决人。

## MVP 放行标准

- Schema 校验可以捕获缺少部门、Agent 引用错误、非法讨论模式和非法审查结果。
- Runtime 可以根据不同 Schema 改变部门数量和讨论方式。
- Ticket 准入审查可以阻止 Owner 冲突、字段缺失和不可执行 Ticket。
- Pipeline DAG 校验可以阻止循环依赖。
- 能力加载审计可以解释每次 Agent、Skill、MCP 和 Tool 的加载原因。
- 记忆检索结果可以解释召回理由、来源对象、审查状态和冲突标记。
