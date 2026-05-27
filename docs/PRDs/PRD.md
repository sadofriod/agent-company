# Agents Company PRD

Agents Company 是一个由多个智能体组成的动态组织系统。系统不预设固定部门数量、固定 Agent 阵容或固定讨论流程，而是通过 JSON Schema 描述组织结构、Agent 能力、协作模式和 Pipeline 执行约束，再由运行时按需加载部门、Agent、Skill、MCP 和 Tool。

除运行时编排外，产品还需要提供面向结构化流程的 UI：在编辑模式中配置讨论流程和 Pipeline DAG，在执行模式中观察讨论与 Pipeline 的执行状态、输入输出和日志。

本文档是产品入口。详细设计按领域拆分如下：

- [docs/01-mvp-scope.md](docs/01-mvp-scope.md)：MVP 范围、非目标和验收标准。
- [docs/02-domain-architecture.md](docs/02-domain-architecture.md)：领域架构、核心对象和协作边界。
- [docs/03-json-schema-driven-loading.md](docs/03-json-schema-driven-loading.md)：JSON Schema 驱动的部门、Agent、讨论和 Pipeline 装配。
- [docs/04-work-modes-and-pipeline.md](docs/04-work-modes-and-pipeline.md)：讨论模式、Pipeline 模式和模式切换规则。
- [docs/05-memory-and-governance.md](docs/05-memory-and-governance.md)：多级记忆、RAG 检索增强、权限矩阵和治理规则。
- [docs/06-review-and-test-plan.md](docs/06-review-and-test-plan.md)：逻辑审查、质量审查和多 Agent 测试计划。
- [docs/07-typescript-technical-design.md](docs/07-typescript-technical-design.md)：TypeScript 技术栈、运行时模块、类型建模和实现里程碑。
- [schemas/team.schema.json](schemas/team.schema.json)：MVP Team Schema 草案。
- [examples/software-delivery-team.json](examples/software-delivery-team.json)：动态部门与 Agent 加载示例。

按模块拆分的需求文档如下：

- [docs/requirements/00-requirements-index.md](docs/requirements/00-requirements-index.md)：模块需求索引、依赖关系和编号约定。
- [docs/requirements/01-organization-schema-requirements.md](docs/requirements/01-organization-schema-requirements.md)：组织与 Schema 装配需求。
- [docs/requirements/02-discussion-decision-requirements.md](docs/requirements/02-discussion-decision-requirements.md)：讨论、Topic、Decision 和 Ticket 草案需求。
- [docs/requirements/03-ticket-pipeline-requirements.md](docs/requirements/03-ticket-pipeline-requirements.md)：Ticket、Pipeline、Step 和 Handoff 需求。
- [docs/requirements/04-capability-loading-requirements.md](docs/requirements/04-capability-loading-requirements.md)：Skill、MCP 和 Tool 加载需求。
- [docs/requirements/05-memory-rag-requirements.md](docs/requirements/05-memory-rag-requirements.md)：记忆、治理过滤、RAG 和 GraphRAG 需求。
- [docs/requirements/06-review-governance-requirements.md](docs/requirements/06-review-governance-requirements.md)：审查与治理需求。
- [docs/requirements/07-runtime-audit-requirements.md](docs/requirements/07-runtime-audit-requirements.md)：运行时编排、错误处理和审计需求。
- [docs/requirements/08-acceptance-test-requirements.md](docs/requirements/08-acceptance-test-requirements.md)：MVP 验收与测试需求。

## 核心产品假设

- 用户输入的不是单个 Agent 指令，而是一个需要组织协作的问题或任务。
- 系统根据 JSON Schema 加载部门结构、Agent 定义、讨论方式、Pipeline 执行规则和能力边界。
- 部门数量可以是 1 个，也可以是多个；讨论方式可以是 Supervisor 主持、线性接力或多部门并行评审。
- Agent 不直接决定自己能访问什么能力，能力由当前 Schema、角色职责、工作模式和步骤上下文共同决定。
- 记忆不是被 Agent 任意拼接的隐式上下文，而是通过治理过滤、RAG/GraphRAG 召回、证据引用和 Review Gate 校验后进入任务上下文。
- 结构化对象是系统流转的最小事实单元，包含 Topic、Decision、Ticket、Pipeline、Handoff、ReviewResult 和 MemoryObject。
- UI 不是独立配置源，而是结构化对象和审计事件的可视化编辑与观察层。

## MVP 总目标

MVP 要证明一件事：**同一套运行时可以通过不同 JSON Schema 动态加载不同 Agent Team，并稳定完成讨论、拆解、审查和 Pipeline 执行。**

MVP 不追求覆盖所有企业组织形态，也不追求一次性接入大量外部工具。第一版重点验证动态组织装配、结构化交付、单 Ticket Pipeline 和审查回退闭环。

## 主流程

1. 用户提交原始任务。
2. 系统读取 Team Schema，确定可用部门、Agent、讨论方式和能力边界。
3. Supervisor 或路由器判断进入讨论模式或直接创建 Ticket。
4. 讨论模式产出 Topic、Decision 和 Ticket 草案。
5. Review Gate 对 Ticket 做准入逻辑审查和质量审查。
6. 通过审查后，系统根据 Pipeline Schema 为单个 Ticket 创建 DAG。
7. Pipeline Step Executor 按步骤加载最小能力并执行。
8. 每次 Handoff 和步骤结果进入下游前都经过审查。
9. 若发现边界错误、能力缺失或跨部门新决策，回退到讨论模式。

## 成功标准

- 更换 Team Schema 后，不改运行时代码即可改变部门数量、Agent 阵容和讨论方式。
- 每个 Ticket 都有唯一 Owner、明确输入输出、验收标准和失败处理。
- 每个 Pipeline 都只服务于一个 Ticket，并且能被校验为 DAG。
- Agent、Skill、MCP 和 Tool 的加载理由可追踪、可撤销、可复盘。
- Review Gate 能阻止 Owner 冲突、字段缺失、循环依赖、能力越权和缺少证据支撑的记忆引用。
- 用户可以通过可视化 workflow 编辑器编辑讨论流程和 Pipeline，并在执行态查看每一步的输入输出、日志和状态流转。
