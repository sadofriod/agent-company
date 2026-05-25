# Domain Architecture

## 领域分层

Agents Company 按领域拆成六层：

1. Organization Layer：部门、Agent、Owner、协作关系。
2. Capability Layer：Skill、MCP、Tool 的按需加载。
3. Delivery Layer：Topic、Decision、Ticket、Pipeline、Handoff 的结构化交付。
4. Memory Layer：系统级、Session 级、Topic 级、Ticket 级记忆，以及 RAG/GraphRAG 检索增强。
5. Review Layer：逻辑审查、质量审查和放行事件。
6. Runtime Layer：根据 Schema 执行路由、讨论、Pipeline 和回退。

## 核心对象

### TeamDefinition

TeamDefinition 是运行时的入口配置，描述当前 Agent Team 的组织结构、讨论方式、能力策略和审查策略。

### Department

Department 是业务责任边界，不只是 Agent 分组。它定义自己能决策什么、不能决策什么、与其他部门如何交接。

### AgentDefinition

AgentDefinition 描述单个 Agent 的职责、模型、输入输出契约和能力边界。运行时只能加载 Schema 中声明或由治理策略允许派生的 Agent。

### DiscussionPolicy

DiscussionPolicy 描述讨论拓扑、最大轮次、冲突裁决、输出对象和退出条件。

### Topic

Topic 是需要讨论的问题域，包含目标、上下文、约束、参与部门和预期结论。

### Decision

Decision 是被冻结的结构化判断，用于驱动 Ticket 创建、Pipeline 执行或回退。

### Ticket

Ticket 是可执行工作单元，必须满足单一目标、单一 Owner、可验收和可组织为 DAG。

### Pipeline

Pipeline 是单个 Ticket 的执行 DAG，包含步骤、依赖、输入输出、异常处理和审查点。

### Handoff

Handoff 是跨部门、跨 Agent 或跨 Pipeline 步骤的结构化交接动作。

### ReviewResult

ReviewResult 是审查与放行层的结构化输出，决定对象是否可以继续流转。

### MemoryRetriever

MemoryRetriever 是 Memory Layer 与 Runtime Layer 之间的检索入口。它不扩大 Agent 的记忆权限，只在治理允许的范围内执行向量召回、图遍历、重排和证据打包。

### MemoryIndex

MemoryIndex 保存 MemoryObject 与其来源对象的可检索表示。MVP 至少包含向量索引；当启用 GraphRAG 时，还包含 Topic、Decision、Ticket、Pipeline、Handoff、ReviewResult 和 Capability 之间的关系边。

## 领域边界原则

- Organization Layer 决定谁参与，不决定具体工具调用。
- Capability Layer 决定能用什么，不改变业务 Owner。
- Delivery Layer 只传递结构化对象，不承载隐式上下文。
- Memory Layer 保存状态和历史，通过 RAG/GraphRAG 提供可追溯证据，不替代审查结论。
- Review Layer 决定能否继续流转，不替代 Owner 做业务决策。
- Runtime Layer 执行 Schema，不在运行中发明未声明的协作规则。

## RAG 与 GraphRAG 边界

RAG 用于提升记忆读取准确性，不用于绕过权限矩阵或自动升级记忆作用域。运行时读取历史上下文时，应先执行治理过滤，再进入检索与重排。

MVP 支持两级模式：

- Standard RAG：对 MemoryObject、Decision、Ticket、Handoff 和 ReviewResult 做向量召回，适合事实查找和局部上下文补全。
- GraphRAG：在向量召回基础上沿结构化对象关系做 1 到 2 跳遍历，适合追踪 Topic、Decision、Ticket、Handoff 和 ReviewResult 的推导链。

推荐图谱关系包括：

- `OWNS`：Department 或 Agent 拥有 Topic、Ticket 或 PipelineStep。
- `DERIVED_FROM`：Ticket 来源于 Decision，Pipeline 来源于 Ticket。
- `REFERENCES`：MemoryObject 引用原始结构化对象或证据。
- `REVIEWED_BY`：对象被 ReviewResult 审查。
- `SUPERSEDES`：新版本记忆替代旧版本。
- `CONTRADICTS`：记忆之间存在冲突，必须进入 Review Gate。
- `REQUIRES_CAPABILITY`：步骤或 Agent 需要某个 Skill、MCP 或 Tool。

## 主流 Agent Team 对齐

该设计对齐主流多 Agent 系统中的四类架构：

- Supervisor 架构：适合复杂任务路由、冲突裁决和多部门收敛。
- Sequential Workflow：适合固定顺序的接力式任务。
- Parallel Review：适合多专家并行评审后聚合。
- DAG Pipeline：适合可执行、可恢复、可审计的任务执行。

MVP 不采用完全自由的网状协作作为默认形态，因为它更容易产生循环依赖、上下文漂移和责任不清。
