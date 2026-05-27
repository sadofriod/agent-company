# Runtime And Audit Implementation

## 实现目标

Runtime And Audit 模块把 Schema 装配、工作模式路由、讨论、Review、Pipeline、Memory 和 Capability 串成一次可追踪的执行过程。它负责统一状态流转、中断回退、错误模型和审计事件。

## 源文档

- [../requirements/07-runtime-audit-requirements.md](../requirements/07-runtime-audit-requirements.md)
- [../PRDs/02-domain-architecture.md](../PRDs/02-domain-architecture.md)
- [../PRDs/03-json-schema-driven-loading.md](../PRDs/03-json-schema-driven-loading.md)
- [../PRDs/04-work-modes-and-pipeline.md](../PRDs/04-work-modes-and-pipeline.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)

## 责任边界

Runtime 负责编排，不直接实现具体领域校验、外部 Tool、LLM、数据库或文件系统细节。外部能力通过 ports 调用，领域规则通过对应模块纯函数完成。

对于执行模式，Runtime 还负责把讨论和 Pipeline 的状态变化整理为可观察的结构化事件流，但不负责前端流程图渲染本身。

## 推荐文件

```text
src/domain/runtime.ts
src/runtime/createExecutionContext.ts
src/runtime/routeWorkMode.ts
src/runtime/executeRuntime.ts
src/runtime/handleInterruption.ts
src/runtime/normalizeRuntimeError.ts
src/ports/auditPort.ts
src/adapters/inMemory/inMemoryAuditPort.ts
```

## 核心类型

- `ExecutionContext`：单次用户任务上下文，包含 task、runtime_id、trace、audit、memory scope 和当前工作模式。
- `WorkModeDecision`：运行时路由结果，包含 mode、reason 和 requiredObjects。
- `RuntimeState`：当前结构化对象、模式、错误和下一步动作。
- `RuntimeError`：判别联合错误，例如 `schema_invalid`、`capability_missing` 和 `review_block`。
- `AuditEvent`：关键动作的结构化记录。
- `ExecutionTimelineView`：供执行模式消费的时序投影，串联讨论节点、Pipeline Step、Review 和中断动作。

## 主流程

1. 读取并校验 Team Schema，创建 RuntimePlan。
2. 为用户任务创建独立 ExecutionContext。
3. `routeWorkMode` 根据任务清晰度、Ticket 完整度、ReviewResult 和 PipelineInterruption 选择模式。
4. Discussion 模式执行讨论，产出 Topic、Decision 和 TicketDraft。
5. TicketDraft 进入 Review Gate，未通过时返回修订或阻塞。
6. Pipeline 模式只接收已通过准入审查的 Ticket。
7. Pipeline Step 执行前调用 Capability Loading 和 Memory Retrieval。
8. Step Result、Handoff 和 Pipeline 状态进入 Review Gate。
9. 中断由 `handleInterruption` 转换为 `revise_upstream`、`reload_capability` 或 `return_to_discussion`。
10. 每个状态变化都写入 Audit Port。

执行模式应优先消费 `RuntimeState`、`AuditEvent` 和 `ExecutionTimelineView` 展示节点状态、输入输出和日志摘要，确保 UI 只是运行时事实的投影。

## 工作模式路由

讨论模式用于目标不清晰、成功标准缺失、Owner 冲突、跨部门决策或 Ticket 不可执行。Pipeline 模式只用于目标清晰、唯一 Owner、验收标准可验证、DAG 可构造且通过准入审查的 Ticket。

Pipeline 中发现边界错误、Owner 不唯一、能力缺口无法解决、DAG 被破坏或新增跨部门决策时，必须回退讨论模式。

## 错误模型

Runtime 不抛出裸异常穿透业务层。外部异常应被转换为结构化 RuntimeError，包含 `code`、`message`、`target_type`、`target_id` 和建议动作。

禁止把 Schema 错误、权限拒绝、能力缺失、Review Block 降级成普通文本后继续执行。

## 审计事件

审计事件覆盖 Schema 加载、Department 与 Agent 解析、工作模式切换、Discussion 轮次、ReviewResult、Pipeline 创建、Step 状态、Capability 加载或拒绝、Memory 检索或冲突、Handoff 生成和消费。

审计事件不保存未授权原文上下文，只保存必要字段、对象 ID、原因和证据引用。

为支持执行模式，建议审计事件为每个讨论节点和 Pipeline Step 记录可展示的状态变更、对象 ID、输入输出引用和日志摘要索引。

## 测试建议

- 从 [../examples/software-delivery-team.json](../examples/software-delivery-team.json) 创建 RuntimePlan 并执行一次完整讨论到 Pipeline 的模拟流程。
- Ticket 未通过准入审查时，确认 Runtime 不创建 Pipeline。
- Pipeline 中断时，确认返回明确回退动作。
- Capability Missing、Memory Conflict、Review Block 都应归一为结构化 RuntimeError。
- 审计事件应能复盘一次任务从 Schema 加载到最终结果的完整路径。
- 执行模式应能仅凭 Runtime 状态和审计事件重建讨论流程与 Pipeline 的执行视图。
