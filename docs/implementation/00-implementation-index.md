# Implementation Documents Index

本目录把现有 PRD、模块需求和 Team Schema 转换为可执行的实现文档。每个模块文档都回答四个问题：模块边界是什么、代码建议放在哪里、核心函数如何组合、需要哪些测试证明它可工作。

## 源文档

- [../PRDs/PRD.md](../PRDs/PRD.md)：产品入口和 MVP 主流程。
- [../PRDs/02-domain-architecture.md](../PRDs/02-domain-architecture.md)：领域分层、核心对象和边界原则。
- [../PRDs/03-json-schema-driven-loading.md](../PRDs/03-json-schema-driven-loading.md)：Team Schema 装配规则。
- [../PRDs/04-work-modes-and-pipeline.md](../PRDs/04-work-modes-and-pipeline.md)：讨论模式、Pipeline 模式和切换规则。
- [../PRDs/05-memory-and-governance.md](../PRDs/05-memory-and-governance.md)：记忆、RAG、GraphRAG 和治理规则。
- [../PRDs/06-review-and-test-plan.md](../PRDs/06-review-and-test-plan.md)：审查层与测试计划。
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)：TypeScript 技术方案。
- [../requirements/00-requirements-index.md](../requirements/00-requirements-index.md)：模块需求索引。
- [../schemas/team.schema.json](../schemas/team.schema.json)：MVP Team Schema。
- [../examples/software-delivery-team.json](../examples/software-delivery-team.json)：软件交付团队示例。

## 模块实现文档

- [01-organization-schema-implementation.md](01-organization-schema-implementation.md)：Team Schema 读取、校验、引用完整性和 RuntimePlan 创建。
- [02-discussion-decision-implementation.md](02-discussion-decision-implementation.md)：讨论拓扑、Topic、Decision 和 Ticket Draft 生成。
- [03-ticket-pipeline-implementation.md](03-ticket-pipeline-implementation.md)：Ticket 准入、单 Ticket Pipeline、DAG 执行和 Handoff。
- [04-capability-loading-implementation.md](04-capability-loading-implementation.md)：Skill、MCP Server 和 Tool 的解析、授权、加载与审计。
- [05-memory-rag-implementation.md](05-memory-rag-implementation.md)：多级记忆、治理过滤、RAG/GraphRAG 和证据包。
- [06-review-governance-implementation.md](06-review-governance-implementation.md)：Logic Review、Quality Review、Review Gate 和治理放行。
- [07-runtime-audit-implementation.md](07-runtime-audit-implementation.md)：ExecutionContext、工作模式路由、中断回退和审计流。
- [08-acceptance-test-implementation.md](08-acceptance-test-implementation.md)：MVP 验收测试、集成测试和放行矩阵。

## 推荐实现顺序

1. Organization And Schema：先保证 Team Schema 能稳定变成不可变 RuntimePlan。
2. Review And Governance：先有准入边界，后续模块才能统一返回 `pass`、`revise` 或 `block`。
3. Discussion And Decision：把不清晰任务收敛为 Topic、Decision 和 Ticket Draft。
4. Ticket And Pipeline：把已审查 Ticket 转换为单 Ticket DAG 并执行步骤。
5. Capability Loading：在 Pipeline Step 和 Review 中落地最小能力授权。
6. Memory And RAG：先实现治理过滤和内存检索，再扩展向量和图索引。
7. Runtime And Audit：把模块串联成完整执行路径，统一错误和审计事件。
8. Acceptance And Test：用场景测试覆盖 MVP 放行标准。

## 横切实现约束

- Team Schema 是组织、Agent、讨论策略、能力边界和审查策略的唯一装配来源。
- JSON Schema 只负责字段形状，跨字段业务规则必须由纯函数补充校验。
- RuntimePlan 创建后视为不可变，每次用户任务创建独立 ExecutionContext。
- 结构化对象进入下游前必须经过 Review Gate，运行时不得绕过审查。
- 能力加载、记忆检索、审查结论和模式切换都必须写入审计事件。
- 外部输入先作为 `unknown` 进入系统，经过校验或解析后再收窄为领域类型。
- 核心逻辑优先写成小型纯函数，外部依赖通过 ports 和 adapters 隔离。
