# Memory And RAG Requirements

## 模块目标

Memory And RAG 模块负责在治理允许的范围内读取、写入、索引和召回记忆。RAG 和 GraphRAG 只能提升已授权记忆的读取准确性，不能扩大权限。

## 范围

本模块包含：

- System、Session、Topic、Ticket 四级记忆。
- MemoryObject 元数据管理。
- 治理过滤。
- 向量索引和图索引。
- RAG/GraphRAG 召回、重排和证据打包。
- 记忆冲突识别。

本模块不负责：

- 自动升级记忆作用域。
- 替代 Review Gate 裁决冲突。
- 允许 Agent 直接读取未经治理过滤的历史上下文。

## 输入

- Agent、role、work mode、step_id 和 `memory_access_policy`。
- MemoryPolicy。
- MemoryObject、Decision、Ticket、Handoff、ReviewResult。
- 查询意图或当前任务上下文。

## 输出

- `MemoryContextPackage`。
- `retrieved_memory_ids`。
- `source_refs`。
- `confidence`。
- `conflict_flags`。
- Memory 读写与索引审计事件。

## 功能需求

- `MEM-001`：系统必须支持 System Memory、Session Memory、Topic Memory 和 Ticket Memory。
- `MEM-002`：每个 MemoryObject 必须包含 `memory_id`、`scope`、`source_object_type`、`source_object_id`、`summary`、`visibility`、`expiry_condition`、`version`、`source_refs`、`embedding_status` 和 `review_status`。
- `MEM-003`：所有记忆读取必须通过 MemoryRetriever。
- `MEM-004`：MemoryRetriever 必须先按 scope、visibility、role、expiry、version、review_status 和权限矩阵过滤，再执行向量召回或图遍历。
- `MEM-005`：Standard RAG 必须支持对 MemoryObject、Decision、Ticket、Handoff 和 ReviewResult 做向量召回。
- `MEM-006`：GraphRAG 必须在向量召回基础上沿结构化关系做有限跳数遍历。
- `MEM-007`：Discussion 模式默认最多支持 2 跳图遍历。
- `MEM-008`：Pipeline Step Executor 默认最多支持 1 跳图遍历。
- `MEM-009`：检索结果必须包含 `memory_id`、`source_object_type`、`source_object_id` 和证据摘要。
- `MEM-010`：由历史记忆支撑的 Decision、Ticket、Handoff 和 ReviewResult 必须记录 `retrieved_memory_ids` 或等价证据引用。
- `MEM-011`：召回内容存在冲突、过期、被替代或被 block 标记时，必须返回冲突标记并交给 Review Gate 或 Supervisor 裁决。
- `MEM-012`：Ticket 级执行经验不得自动写入 System Memory。
- `MEM-013`：索引失败时记忆可以保存，但不得作为高置信检索结果使用。

## 图谱关系需求

- `OWNS`：Department 或 Agent 拥有 Topic、Ticket 或 PipelineStep。
- `DERIVED_FROM`：Ticket 来源于 Decision，Pipeline 来源于 Ticket。
- `REFERENCES`：MemoryObject 引用原始结构化对象或证据。
- `REVIEWED_BY`：对象被 ReviewResult 审查。
- `SUPERSEDES`：新版本记忆替代旧版本。
- `CONTRADICTS`：记忆之间存在冲突。
- `REQUIRES_CAPABILITY`：步骤或 Agent 需要某个 Skill、MCP 或 Tool。

## 验收标准

- 未授权范围在向量检索前被拒绝。
- 基于记忆生成的结论可追溯到被召回的 MemoryObject 或原始结构化对象。
- 冲突记忆不会被下游 Agent 静默选择。
- Step Executor 无法读取无关 Topic Memory 或其他 Ticket Memory。