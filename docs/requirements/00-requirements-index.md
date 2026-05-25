# Module Requirements Index

本文档集把现有设计内容进一步整理为按模块拆分的需求说明。设计文档回答“系统为什么这样设计”，本目录回答“每个模块必须交付什么能力、接收什么输入、输出什么结果，以及如何验收”。

## 模块清单

- [01-organization-schema-requirements.md](01-organization-schema-requirements.md)：Team Schema、部门、Agent 和讨论策略的装配需求。
- [02-discussion-decision-requirements.md](02-discussion-decision-requirements.md)：讨论模式、Topic、Decision 和 Ticket 草案生成需求。
- [03-ticket-pipeline-requirements.md](03-ticket-pipeline-requirements.md)：Ticket 准入、Pipeline DAG、步骤执行和中断回退需求。
- [04-capability-loading-requirements.md](04-capability-loading-requirements.md)：Skill、MCP、Tool 的解析、授权、加载和审计需求。
- [05-memory-rag-requirements.md](05-memory-rag-requirements.md)：多级记忆、治理过滤、RAG/GraphRAG 检索和证据包需求。
- [06-review-governance-requirements.md](06-review-governance-requirements.md)：逻辑审查、质量审查、治理放行和阻塞规则需求。
- [07-runtime-audit-requirements.md](07-runtime-audit-requirements.md)：运行时编排、工作模式路由、错误处理和审计事件需求。
- [08-acceptance-test-requirements.md](08-acceptance-test-requirements.md)：MVP 验收、测试场景和放行标准。

## 模块依赖关系

```text
Team Schema
  -> Organization And Agent Loading
  -> Discussion And Decision
  -> Review Gate
  -> Ticket And Pipeline
  -> Capability Loading
  -> Memory Retrieval
  -> Runtime Audit
```

Review Gate 是所有结构化对象进入下游前的强制边界。Memory Retrieval 只提供已授权范围内的证据增强，不改变组织、能力或审查权限。

## 需求编号约定

- `ORG`：组织与 Schema 装配。
- `DISC`：讨论、Topic 和 Decision。
- `PIPE`：Ticket 与 Pipeline。
- `CAP`：能力加载。
- `MEM`：记忆与 RAG。
- `REV`：审查与治理。
- `RUN`：运行时与审计。
- `TEST`：验收与测试。

## 与原设计文档的关系

- MVP 边界来源：[../01-mvp-scope.md](../01-mvp-scope.md)。
- 领域对象来源：[../02-domain-architecture.md](../02-domain-architecture.md)。
- Schema 装配来源：[../03-json-schema-driven-loading.md](../03-json-schema-driven-loading.md)。
- 工作模式来源：[../04-work-modes-and-pipeline.md](../04-work-modes-and-pipeline.md)。
- 记忆治理来源：[../05-memory-and-governance.md](../05-memory-and-governance.md)。
- 审查测试来源：[../06-review-and-test-plan.md](../06-review-and-test-plan.md)。
- TypeScript 实现建议来源：[../07-typescript-technical-design.md](../07-typescript-technical-design.md)。