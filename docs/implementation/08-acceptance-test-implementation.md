# Acceptance And Test Implementation

## 实现目标

Acceptance And Test 模块把 MVP 放行标准转成可执行测试。测试重点不是覆盖所有企业组织形态，而是证明同一套 Runtime 可以通过不同 Team Schema 动态加载不同 Agent Team，并稳定完成讨论、拆解、审查、Pipeline 执行和回退。

## 源文档

- [../requirements/08-acceptance-test-requirements.md](../requirements/08-acceptance-test-requirements.md)
- [../PRDs/06-review-and-test-plan.md](../PRDs/06-review-and-test-plan.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)
- [../examples/software-delivery-team.json](../examples/software-delivery-team.json)

## 推荐文件

```text
src/tests/fixtures/teamSchemas.ts
src/tests/fixtures/pipelines.ts
src/tests/fixtures/memoryObjects.ts
src/tests/organizationSchema.test.ts
src/tests/discussionDecision.test.ts
src/tests/ticketPipeline.test.ts
src/tests/capabilityLoading.test.ts
src/tests/memoryRag.test.ts
src/tests/reviewGovernance.test.ts
src/tests/runtimeAudit.test.ts
src/tests/acceptance.test.ts
```

## 测试分层

单元测试覆盖纯函数：Schema 引用完整性、工作模式路由、Ticket 准入审查、Pipeline DAG 校验、能力交集解析、Memory scope 过滤和 Review Gate 状态映射。

集成测试覆盖模块组合：使用 Team Schema 创建 RuntimePlan，执行讨论拓扑，生成 TicketDraft，准入审查，通过后创建 Pipeline，并验证中断和回退。

契约测试覆盖跨边界数据：Team Schema 示例必须通过 JSON Schema 校验，结构化输出必须能被 Review Gate 消费，Handoff 必须满足下游 Step 输入契约。

## Fixture 设计

至少准备以下 Team Schema fixture：单部门团队、双部门软件交付团队、五部门临时项目团队、Agent 引用错误、Supervisor 引用错误、非法讨论模式和缺失 memory profile。

至少准备以下 Pipeline fixture：有效 DAG、循环依赖、跨 Ticket Step、缺少 Owner、缺少输入字段、未授权 Tool 和能力不存在。

至少准备以下 Memory fixture：已审查记忆、未审查记忆、过期记忆、被替代记忆、冲突记忆、Ticket Memory 尝试升级 System Memory。

## MVP 场景矩阵

| 场景 | 主要断言 |
| --- | --- |
| Dynamic Department Loading | 不改运行时代码即可加载 1、2、5 个部门 |
| Discussion Topology Switch | 三种 `discussion_policy.mode` 都产出同类结构化对象 |
| Handoff Field Missing | Quality Review 返回 `revise` 并指向责任上游 |
| Owner Conflict | Logic Review 返回 `block`，不得进入 Pipeline |
| Pipeline Cycle | DAG 校验失败，Pipeline 不启动 |
| Capability Missing | Step 中断并返回 `capability_missing` |
| Memory Scope Pollution | 治理策略拒绝 Ticket Memory 直接写入 System Memory |
| RAG Evidence Missing | Quality Review 要求补充 `retrieved_memory_ids` 或 `source_refs` |
| Memory Conflict Retrieved | Runtime 标记 `memory_conflict` 并交由 Review Gate 或 Supervisor |
| Unauthorized Memory Retrieval | 治理过滤在向量检索前拒绝无关 scope |
| Infinite Discussion Loop | 达到 `max_rounds` 后停止并输出未决项 |

## 放行断言

- 更换 Team Schema 后，部门数量、Agent 阵容和讨论方式可以变化。
- 每个 Ticket 都有唯一 Owner、明确输入输出、验收标准和失败处理。
- 每个 Pipeline 都只服务于一个 Ticket，并且能被校验为 DAG。
- Agent、Skill、MCP 和 Tool 的加载理由可追踪、可撤销、可复盘。
- Review Gate 能阻止 Owner 冲突、字段缺失、循环依赖、能力越权和缺少证据支撑的记忆引用。
- 基于记忆生成的结论可以追溯到被召回的 MemoryObject 或原始结构化对象。

## 执行建议

使用 Vitest 作为测试运行器。MVP 阶段优先让领域纯函数和内存 adapter 可测，真实 LLM、向量数据库和图数据库通过 Port mock 或 in-memory adapter 替代。

测试命名应直接表达需求编号或场景，例如 `ORG-005 rejects agent with unknown department`、`PIPE-007 rejects cyclic pipeline`、`MEM-004 filters unauthorized scope before retrieval`。

## 交付检查清单

- 所有正向 fixture 可以创建 RuntimePlan。
- 所有负向 fixture 返回结构化错误，不进入下游流程。
- 审计事件覆盖 Schema、Discussion、Review、Pipeline、Capability、Memory 和 Handoff。
- 每个 `pass`、`revise` 和 `block` 都有至少一个自动化测试。
- 严格 TypeScript 编译通过，不使用 `any` 和 default export。
