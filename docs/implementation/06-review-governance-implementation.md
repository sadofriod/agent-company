# Review And Governance Implementation

## 实现目标

Review And Governance 模块判断结构化对象是否可以继续流转。它不替代 Owner 做业务决策，只检查对象是否自洽、完整、可消费、可复盘，并对记忆提升和冲突处理提供治理边界。

## 源文档

- [../requirements/06-review-governance-requirements.md](../requirements/06-review-governance-requirements.md)
- [../PRDs/06-review-and-test-plan.md](../PRDs/06-review-and-test-plan.md)
- [../PRDs/05-memory-and-governance.md](../PRDs/05-memory-and-governance.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)

## 责任边界

本模块负责 Logic Review、Quality Review、Review Gate、治理放行和 Review 审计。它不执行 Pipeline Step，不创建未声明部门或 Agent，也不静默修复上游对象。

## 推荐文件

```text
src/domain/review.ts
src/review/logicReview.ts
src/review/qualityReview.ts
src/review/reviewGate.ts
src/review/reviewMemoryPromotion.ts
src/review/mergeReviewResults.ts
src/ports/auditPort.ts
```

## 核心类型

- `ReviewTargetType`：`topic`、`decision`、`ticket`、`pipeline`、`handoff`、`step_output` 或 `memory_object`。
- `ReviewRequest<T>`：审查对象、目标类型、上下文和证据包。
- `ReviewIssue`：字段、严重级别、说明和建议修订 Owner。
- `ReviewResult`：`pass`、`revise` 或 `block`，包含 reviewer、issues 和 evidenceRefs。
- `GovernanceDecision`：记忆提升或治理放行结果。

## Review Gate 流程

1. Runtime 调用 `reviewGate`，传入目标对象、ReviewPolicy 和 ExecutionContext。
2. 根据 target type 选择必需审查项，Ticket 准入使用 `ticket_admission`，Step 完成使用 `step_completion`。
3. 先执行 `logicReview`，检查目标、Owner、依赖、DAG、冲突处理和推导链。
4. Logic Review 返回 `block` 时立即停止下游流转。
5. 继续执行 `qualityReview`，检查字段完整性、Schema 符合性、证据引用、验收标准、失败处理和 Handoff 可消费性。
6. `mergeReviewResults` 合并多个审查结果，严重级别按 `block`、`revise`、`pass` 排序。
7. 写入 ReviewResult 审计事件，并由 Runtime 决定继续、修订或回退。

## 状态语义

`pass` 表示允许进入下一步。`revise` 表示对象可修补，应退回最近责任 Owner。`block` 表示结构性问题，必须回退到讨论模式或重建上游对象。

缺少必填字段、缺少证据引用和 Handoff 不可消费通常返回 `revise`。Owner 冲突、Pipeline 循环、能力越权、记忆冲突未裁决和结构性边界错误必须返回 `block`。

## 治理放行

Session 结论和 Ticket 经验不得自动升级为 System Memory。`reviewMemoryPromotion` 必须先执行 Logic Review、Quality Review，再检查治理权限矩阵。只有通过治理放行的对象才能写入更高 scope。

## 错误与审计

常见错误包括 `review_revise`、`review_block` 和 `memory_conflict`。审计事件记录 target type、target ID、reviewer、结果、问题列表、证据引用、建议 Owner 和是否允许继续流转。

## 测试建议

- Ticket 缺少验收标准，确认 Quality Review 返回 `revise`。
- 两个 Owner 声明同一 Ticket，确认 Logic Review 返回 `block`。
- Pipeline 存在环，确认 Review Gate 阻止放行。
- 基于记忆的 Decision 缺少证据，确认返回 `revise`。
- 记忆提升到 System Memory，确认必须经过治理放行。
