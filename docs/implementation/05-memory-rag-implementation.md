# Memory And RAG Implementation

## 实现目标

Memory And RAG 模块在治理允许的范围内读取、写入、索引和召回记忆。RAG 和 GraphRAG 只提升已授权记忆的读取准确性，不能扩大 Agent 权限，也不能替代 Review Gate 裁决冲突。

## 源文档

- [../requirements/05-memory-rag-requirements.md](../requirements/05-memory-rag-requirements.md)
- [../PRDs/05-memory-and-governance.md](../PRDs/05-memory-and-governance.md)
- [../PRDs/02-domain-architecture.md](../PRDs/02-domain-architecture.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)

## 责任边界

本模块负责 MemoryObject 元数据、治理过滤、向量召回、图遍历、重排、证据打包和冲突标记。它不负责自动升级记忆作用域，不负责裁决业务冲突，也不允许 Agent 直接读取未经治理过滤的历史上下文。

## 推荐文件

```text
src/domain/memory.ts
src/memory/retrieveMemory.ts
src/memory/filterMemoryByGovernance.ts
src/memory/rankMemory.ts
src/memory/writeMemory.ts
src/memory/indexMemory.ts
src/memory/detectMemoryConflict.ts
src/ports/memoryStorePort.ts
```

## 核心类型

- `MemoryObject`：记忆事实单元，包含 scope、来源对象、摘要、可见性、版本、证据和审查状态。
- `MemoryQuery`：检索请求，包含 requester、scope、profile、query 和可选 Ticket/Topic ID。
- `RetrievedMemory`：召回结果，包含分数、来源、审查状态和冲突信息。
- `MemoryContextPackage`：进入下游 Agent 上下文的证据包。
- `MemoryGraphEdge`：GraphRAG 关系边，例如 `DERIVED_FROM`、`REFERENCES` 和 `CONTRADICTS`。

## 写入流程

1. 结构化对象通过 Review 或 Runtime 触发写入。
2. `writeMemory` 校验写入角色、目标 scope 和来源对象。
3. 保存 MemoryObject 元数据和摘要。
4. `indexMemory` 创建结构化索引；MVP 可先使用内存索引。
5. 向量索引失败时仍可保存记忆，但标记为低置信，不作为高置信召回结果。
6. 写入和索引结果进入审计流。

## 检索流程

1. 根据 Agent、role、work mode、step_id 和 `memory_access_policy` 解析 Retrieval Profile。
2. `filterMemoryByGovernance` 在向量召回前按 scope、visibility、role、expiry、version、review_status 和权限矩阵过滤。
3. Standard RAG 对 MemoryObject、Decision、Ticket、Handoff 和 ReviewResult 做向量召回。
4. GraphRAG 在向量召回基础上沿结构化关系做有限跳数遍历。
5. `rankMemory` 按审查状态、来源权威性、版本新旧、时间衰减和关系强度重排。
6. `detectMemoryConflict` 标记过期、被替代、被 block 或相互冲突的记忆。
7. 输出 `MemoryContextPackage`，包含 `retrieved_memory_ids`、`source_refs`、`confidence` 和 `conflict_flags`。

## GraphRAG 限制

Discussion 模式默认最多 2 跳，Pipeline Step Executor 默认最多 1 跳。超过跳数、出现 `CONTRADICTS` 或召回被替代记忆时，应返回冲突标记并交给 Review Gate 或 Supervisor。

## 治理规则

- System、Session、Topic 和 Ticket 四级记忆必须分 scope 管理。
- Ticket 级执行经验不得自动写入 System Memory。
- Session 结论不得自动升级为 System Memory。
- Step Executor 只能读取当前步骤必需的 System 和 Ticket 记忆。
- 由历史记忆支撑的 Decision、Ticket、Handoff 和 ReviewResult 必须记录证据引用。

## 错误与审计

常见错误包括 `memory_access_denied`、`memory_conflict` 和 `memory_index_unavailable`。审计事件记录检索 profile、请求 scope、过滤结果、召回结果数量、冲突标记、写入对象和索引状态。

## 测试建议

- Step Executor 读取无关 Topic Memory，确认在向量检索前被拒绝。
- 基于记忆生成 Decision，确认输出包含 `retrieved_memory_ids` 或 `source_refs`。
- 构造 `CONTRADICTS` 关系，确认返回 `memory_conflict`。
- 构造索引失败，确认记忆保存但不作为高置信结果。
- 构造 Ticket Memory 升级 System Memory，确认必须经过治理放行。
