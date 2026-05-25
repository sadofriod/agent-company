# Runtime And Audit Requirements

## 模块目标

Runtime And Audit 模块负责把 Schema 装配、工作模式路由、讨论、Review、Pipeline、Memory 和 Capability 串成一次可追踪的执行过程。

## 范围

本模块包含：

- ExecutionContext 创建。
- 工作模式路由。
- 模块间编排。
- 中断和回退处理。
- 审计事件写入。
- 运行时错误归一化。

本模块不负责：

- 实现具体领域校验细节。
- 直接调用外部 Tool 或 LLM。
- 修改 Team Schema 中未声明的规则。

## 输入

- RuntimePlan。
- 用户任务。
- 当前结构化对象状态。
- ReviewResult。
- PipelineInterruption。

## 输出

- 执行状态。
- 下一个工作模式。
- 结构化错误。
- 审计事件流。
- 最终任务结果或回退请求。

## 功能需求

- `RUN-001`：每次用户任务必须创建独立 ExecutionContext。
- `RUN-002`：ExecutionContext 必须包含 task、runtime_id、trace、audit、memory scope 和当前工作模式。
- `RUN-003`：运行时必须先加载并校验 Team Schema，再执行讨论或 Pipeline。
- `RUN-004`：工作模式路由必须根据任务清晰度、Ticket 完整度、ReviewResult 和 PipelineInterruption 决定。
- `RUN-005`：Ticket 未通过准入审查时不得创建 Pipeline。
- `RUN-006`：Pipeline 中断必须转换为明确的回退动作。
- `RUN-007`：Runtime 不得绕过 Review Gate 将对象直接送入下游。
- `RUN-008`：Runtime 不得让 Agent 绕过 MemoryRetriever 读取历史上下文。
- `RUN-009`：每次 Agent、Skill、MCP、Tool、Memory 和 Review 的关键动作都必须写入审计事件。
- `RUN-010`：结构化错误必须包含 code、message、target_type、target_id 和建议动作。
- `RUN-011`：运行时不得把能力缺失、权限拒绝、Schema 错误降级为普通文本提示后继续执行。
- `RUN-012`：运行时必须支持回退到讨论模式重建 Decision 或 Ticket。

## 错误类型

- `schema_invalid`
- `reference_invalid`
- `ticket_admission_failed`
- `pipeline_cycle_detected`
- `capability_missing`
- `capability_denied`
- `memory_access_denied`
- `memory_conflict`
- `review_revise`
- `review_block`
- `discussion_max_rounds_reached`

## 审计需求

- Schema 加载。
- Department 与 Agent 解析。
- 工作模式切换。
- Discussion 轮次与输出。
- ReviewResult。
- Pipeline 创建与 Step 状态。
- Capability 加载与拒绝。
- Memory 检索、冲突和写入。
- Handoff 生成与消费。

## 验收标准

- 一次任务执行可以从审计事件复盘完整路径。
- 所有阻塞和回退都有结构化原因。
- Runtime 可以根据不同 Schema 改变部门数量、讨论方式和能力边界。
- Runtime 不会在执行中发明未声明的协作规则。