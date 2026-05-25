# Memory And Governance

## 多级记忆

系统提供四种记忆作用域：

- System Memory：跨 Session 共享的稳定规则、组织协议、标准术语和长期约束。
- Session Memory：单次用户任务内的目标、上下文、讨论状态和阶段结论。
- Topic Memory：围绕 Topic 或 Subtopic 的背景、争议点、冻结 Decision 和依赖关系。
- Ticket Memory：单个 Ticket 的输入快照、步骤状态、局部决策、异常处理、审查结论和 Handoff 历史。

## 记忆元数据

每个记忆对象至少包含：

- `memory_id`
- `scope`
- `source_object_type`
- `source_object_id`
- `created_at`
- `updated_at`
- `summary`
- `visibility`
- `expiry_condition`
- `version`
- `source_refs`
- `embedding_status`
- `review_status`

`source_refs` 用于回溯原始 Topic、Decision、Ticket、Handoff、ReviewResult 或审计事件。`embedding_status` 用于标记记忆是否已经进入检索索引。`review_status` 用于区分候选记忆、已审查记忆、被阻塞记忆和已失效记忆。

## RAG 增强记忆架构

RAG 是记忆读取的准确性增强层，不是新的权限通道。所有检索必须先通过治理过滤，再进入召回、图遍历和重排。

### Memory Indexing

运行时在写入记忆后创建 MemoryIndex：

- 向量索引：保存 MemoryObject、Decision、Ticket、Handoff 和 ReviewResult 的摘要、关键字段和来源片段。
- 结构化索引：保存 scope、visibility、owner、source_object_type、source_object_id、version、expiry_condition 和 review_status。
- 图索引：当启用 GraphRAG 时，保存 Topic、Decision、Ticket、Pipeline、Handoff、ReviewResult、Agent、Department 和 Capability 之间的关系。

进入索引的文本必须保留来源对象 ID。Agent 不能只引用召回摘要作为事实依据。

### Memory Retrieval

读取记忆时使用以下顺序：

1. 根据 Agent、role、work mode、step_id 和 `memory_access_policy` 解析检索 profile。
2. 按 scope、visibility、expiry、version、review_status 和权限矩阵做治理过滤。
3. 使用向量检索召回语义相关记忆。
4. 若启用 GraphRAG，从起始记忆沿 Topic、Decision、Ticket、Handoff 和 ReviewResult 关系做有限跳数遍历。
5. 按审查状态、来源权威性、版本新旧、时间衰减和关系强度重排。
6. 输出包含 `retrieved_memory_ids`、`source_refs`、`confidence`、`conflict_flags` 的上下文包。

### GraphRAG 使用边界

GraphRAG 适用于需要追踪推导链或多跳关系的问题，例如“这个 Ticket 的验收标准来自哪个 Decision”或“当前 Handoff 是否引用了被 block 的上游结论”。

默认限制：

- Discussion 模式最多 2 跳遍历。
- Pipeline Step Executor 默认最多 1 跳遍历。
- Review Agent 可以读取审查对象相关的证据链，但不能改写业务事实。
- 超过跳数、出现冲突边或召回被替代记忆时，返回 `memory_conflict` 或 `needs_review`。

## 读取策略

- 讨论模式优先读取 System Memory、Session Memory 和 Topic Memory。
- Pipeline 模式优先读取 System Memory 和 Ticket Memory，必要时引用冻结 Topic Memory。
- Step Executor 只能读取当前步骤必需的上下文。
- Review Agent 可以读取审查对象相关上下文，但不能改写业务事实。
- 所有读取都应通过 MemoryRetriever，返回结果必须保留来源和证据引用。

## 写入策略

- Owner 对自己负责的对象拥有主写权限。
- 协作 Agent 默认只能写候选意见、证据和风险标记。
- Step Executor 只能写当前步骤输出、失败原因、重试状态和 Handoff。
- Review Agent 只能写审查结论、阻塞理由、修订建议和放行状态。
- Memory Steward 负责归档、失效、脱敏、版本回滚和系统级记忆发布。
- 写入后由索引器异步或同步更新向量索引和图索引；索引失败时记忆仍可保存，但不得作为高置信检索结果使用。

## 权限矩阵

| Role | System Memory | Session Memory | Topic Memory | Ticket Memory |
| --- | --- | --- | --- | --- |
| Supervisor | Read, reviewed write | Read/write session state | Read/write decisions | Read, write escalation notes |
| Department Owner | Read, propose change | Read/write department plan | Write owned topics | Write owned tickets |
| Topic Owner | Read | Write topic summary | Read/write owned topic | Read derived tickets |
| Collaborator | Read | Append comments | Append candidate input | Write only assigned step input |
| Ticket Owner | Read | Write execution sync | Read frozen decisions | Read/write owned ticket |
| Step Executor | Read required rules | Read required context | Read referenced decisions | Write current step facts |
| Review Agent | Read | Write review index | Write review result | Write review result |
| Memory Steward | Read/write governed rules | Govern metadata | Archive and expire | Archive and expire |

## 升级与降级

- Session 结论不能自动升级为 System Memory。
- Ticket 执行经验默认留在 Ticket Memory。
- 可复用经验必须经过 Logic Review、Quality Review 和治理放行后才能提升。
- Topic 结论下沉到 Ticket 时应通过引用完成，不允许执行 Agent 改写上游结论。
- 被 `SUPERSEDES`、`CONTRADICTS` 或 Review `block` 标记的记忆不得直接进入生成上下文，除非当前任务是审查或冲突裁决。

## 记忆冲突处理

RAG 召回多条相互冲突的记忆时，运行时不得让下游 Agent 静默选择其中一条。处理规则：

- 新旧版本存在 `SUPERSEDES` 关系时，默认使用最新已审查版本，并保留旧版本引用。
- 多个 Owner 对同一事实给出冲突结论时，返回 `memory_conflict`，交由 Supervisor 或 Review Gate 裁决。
- 未审查记忆与已审查记忆冲突时，优先使用已审查记忆，同时将未审查记忆作为风险标记。
- 所有冲突处理结果必须写入 ReviewResult 或审计事件。

## Schema 与治理关系

Team Schema 可以声明默认记忆访问策略，但不能绕过治理规则。若 Schema 授权与治理策略冲突，治理策略优先。

Team Schema 可以通过 `memory_policy` 声明检索模式、索引对象、检索 profile、证据要求和冲突策略。`memory_policy` 只定义运行时如何检索已授权记忆，不改变权限矩阵。
