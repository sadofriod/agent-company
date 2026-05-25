# MVP Scope

## MVP 定位

MVP 是一个 Schema-driven Agent Team Runtime。它的核心不是内置一套固定公司组织，而是允许用户用 JSON Schema 定义一个临时或长期 Agent Team，并让运行时根据该 Schema 动态决定：

- 加载哪些部门。
- 加载哪些 Agent。
- 每个 Agent 的职责、模型、能力边界和输出契约。
- 使用哪种讨论方式。
- 如何生成和执行单 Ticket Pipeline。
- 如何通过 RAG/GraphRAG 检索 scoped memory，并保留可审查证据链。
- 哪些对象必须经过逻辑审查和质量审查。

## MVP 必须支持

### 1. 动态部门加载

系统必须支持从 Team Schema 中读取部门定义。部门数量不应写死，可以是单部门、双部门，也可以是多个部门组成的临时项目组。

每个部门至少包含：

- `department_id`
- `name`
- `mission`
- `decision_scope`
- `agents`
- `handoff_contracts`

### 2. 动态 Agent 加载

系统必须根据 Schema 加载 Agent，而不是在代码中固定 CEO、CTO、CMO 等角色。

每个 Agent 至少包含：

- `agent_id`
- `department_id`
- `role`
- `model`
- `responsibilities`
- `input_contract`
- `output_contract`
- `skills`
- `mcp_servers`
- `tools`
- `memory_access_policy`

### 3. 动态讨论方式

系统必须支持由 Schema 指定讨论拓扑。MVP 至少支持三种：

- `supervisor_led`：由 Supervisor 统一路由、裁决和收敛。
- `sequential_handoff`：部门或 Agent 按顺序接力处理。
- `parallel_review`：多个 Agent 并行给出意见，再由 Owner 或 Supervisor 聚合。

讨论方式必须明确最大轮次、Owner 裁决权、冲突处理和退出条件。

### 4. 单 Ticket Pipeline 执行

MVP 只支持一个 Pipeline 执行一个 Ticket。一个 Topic 若产生多个执行事项，必须拆分为多个 Ticket，再分别创建 Pipeline。

Pipeline 必须满足：

- 唯一 `ticket_id`。
- 步骤可被表示为 DAG。
- 每个步骤有唯一 Step Owner。
- 每个步骤有输入契约、输出契约、失败处理和能力加载规则。
- 每个跨步骤或跨部门 Handoff 都有结构化交付。

### 5. 审查与回退闭环

MVP 必须包含两个审查角色或等价审查流程：

- Logic Review：判断目标、Owner、依赖、DAG 和推导链是否自洽。
- Quality Review：判断字段、格式、证据、验收标准和 Handoff 是否可消费。

审查结果必须是 `pass`、`revise` 或 `block`。未通过审查的对象不得继续进入下游。

### 6. RAG 增强记忆读取

MVP 必须支持基于 Schema 的记忆检索策略。RAG 不改变记忆权限，只提升在已授权范围内读取相关事实的准确性。

最小能力包括：

- 对 MemoryObject、Decision、Ticket、Handoff 和 ReviewResult 建立向量索引。
- 读取记忆前先按 scope、visibility、role、expiry 和 version 做治理过滤。
- 检索结果必须包含 `memory_id`、`source_object_type`、`source_object_id` 和证据摘要。
- 由历史记忆支撑的 Decision、Ticket、Handoff 和 ReviewResult 必须记录 `retrieved_memory_ids` 或等价证据引用。
- 当召回内容存在冲突、过期或被替代关系时，必须交给 Review Gate 或 Supervisor 裁决。

## MVP 暂不支持

- 多 Pipeline 共享可变执行状态。
- Agent 自主创建未在 Schema 中声明的新部门。
- 未经审查的系统级记忆写入。
- 任意网状讨论和无限轮协商。
- 大规模外部工具市场。
- 自动绕过 Review Gate 的紧急执行通道。
- Agent 绕过 MemoryRetriever 直接读取未经治理过滤的历史上下文。

## MVP 验收标准

- 使用不同 Team Schema 可以启动不同部门结构。
- 同一用户任务可以根据 Schema 走不同讨论拓扑。
- Ticket 准入失败时能返回明确阻塞原因。
- Pipeline 中出现字段缺失、循环依赖或能力缺失时能中断并回退。
- 所有 Agent 和 Tool 加载都有结构化审计记录。
- 基于记忆生成的结论可以追溯到被召回的 MemoryObject 或原始结构化对象。
