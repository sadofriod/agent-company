# Ticket And Pipeline Implementation

## 实现目标

Ticket And Pipeline 模块把通过准入审查的单个 Ticket 转换为可执行、可恢复、可审计的 Pipeline DAG。MVP 严格保持一个 Pipeline 服务一个 Ticket，每个 Step 都有明确 Owner、依赖、输入输出、能力边界和失败策略。

## 源文档

- [../requirements/03-ticket-pipeline-requirements.md](../requirements/03-ticket-pipeline-requirements.md)
- [../PRDs/04-work-modes-and-pipeline.md](../PRDs/04-work-modes-and-pipeline.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)
- [../PRDs/06-review-and-test-plan.md](../PRDs/06-review-and-test-plan.md)

## 责任边界

本模块负责 Ticket 准入前置检查、Pipeline 创建、DAG 校验、Step 调度、Handoff 生成和中断回退。它不负责讨论中的业务裁决，也不直接绕过 Capability Loading 调用 Tool。

针对 UI，本模块需要提供可被 React Flow 编辑器使用的 Pipeline 图结构，以及可被执行模式消费的 Step 状态、输入输出、Handoff 和日志摘要视图模型。

## 推荐文件

```text
src/domain/delivery.ts
src/domain/runtime.ts
src/runtime/executePipeline.ts
src/runtime/validatePipelineDag.ts
src/runtime/createPipelineForTicket.ts
src/runtime/handleInterruption.ts
src/ports/toolPort.ts
```

## 核心类型

- `Ticket`：可执行工作单元，包含唯一 Owner、目标、输入输出、验收标准和失败处理。
- `Pipeline`：绑定单个 Ticket 的 DAG。
- `PipelineStep`：DAG 节点，包含依赖、Owner、输入输出、能力、超时、失败策略和审查要求。
- `Handoff`：步骤间或部门间结构化交接。
- `PipelineInterruption`：中断原因和建议动作。
- `PipelineGraphView`：供编辑模式使用的 DAG 图投影，包含节点位置无关的结构化依赖关系和 Step 元数据。
- `PipelineExecutionView`：供执行模式展示的步骤状态、输入输出、Handoff、ReviewResult 和日志摘要。

## 准入前置

Pipeline 创建前必须确认 Ticket 已通过 `review_policy.ticket_admission`。未通过准入审查时 Runtime 不得创建 Pipeline。

Ticket 至少满足：唯一 `ticket_id`、唯一 Owner、单一目标、输入契约、输出契约、验收标准、失败处理和 Decision 来源。

## 核心流程

1. `createPipelineForTicket` 基于已审查 Ticket 创建 Pipeline 草案。
2. `validatePipelineDag` 检查 Step ID 唯一、依赖存在、无环、Step 不跨 Ticket、Owner 唯一。
3. `executePipeline` 对 DAG 做拓扑排序，得到可执行批次。
4. 每个 Step 执行前调用 Capability Loading 解析最小能力集合。
5. Step 通过 Tool Port 或 LLM Port 执行，输出结构化 Step Result。
6. Step Result 进入 Review Gate。
7. Review `pass` 时生成 Handoff，必要时在 Handoff 前再次审查。
8. Review `revise` 时返回最近责任上游修订。
9. Review `block` 或结构性中断时触发 `handleInterruption`。

编辑模式应复用 `validatePipelineDag` 作为保存前校验入口；执行模式应复用 `executePipeline` 过程中产生的 Step 状态与审计事件生成 `PipelineExecutionView`，而不是由前端自行推导。

## DAG 校验

DAG 校验建议实现为纯函数：输入 Pipeline，输出 `ValidationResult<Pipeline>`。循环检测可以使用深度优先搜索或 Kahn 拓扑排序。校验失败返回 `pipeline_cycle_detected` 或字段级 SchemaIssue，不启动 Pipeline。

## 中断动作

- `revise_upstream`：上游输出缺少关键字段或 Handoff 不可消费。
- `reload_capability`：能力存在但当前装配失效，且 Schema 允许重新装配。
- `return_to_discussion`：Ticket 边界错误、Owner 不唯一、新增跨部门决策或 Logic Review 返回 `block`。

## 错误与审计

常见错误包括 `ticket_admission_failed`、`pipeline_cycle_detected`、`capability_missing`、`capability_denied`、`review_revise` 和 `review_block`。

审计事件记录 Pipeline 创建、DAG 校验结果、Step 开始、Step 完成、Step 中断、Handoff 生成、ReviewResult 和回退动作。

## 测试建议

- 单 Ticket 创建单 Pipeline，确认不混入其他 Ticket Step。
- 构造 A 依赖 B、B 依赖 A 的循环，确认 Pipeline 不启动。
- 构造上游字段缺失，确认返回 `revise_upstream`。
- 构造未授权 Tool，确认返回 `capability_missing` 或 `capability_denied`。
- 构造 Step Review `block`，确认回退讨论模式。
- 构造 Pipeline 可视化编辑场景，确认拖拽改线后会触发 DAG 与 Owner 校验。
- 构造执行态查看场景，确认每个 Step 都能读取输入、输出、Handoff 和日志摘要。
