# Review And Governance Requirements

## 模块目标

Review And Governance 模块负责判断结构化对象是否具备继续流转条件。审查层不替代 Owner 做业务判断，只判断对象是否自洽、完整、可消费、可复盘。

## 范围

本模块包含：

- Logic Review。
- Quality Review。
- Review Gate 放行与阻塞。
- 记忆提升治理。
- 冲突与失效记忆处理。

本模块不负责：

- 执行业务步骤。
- 创建未声明部门或 Agent。
- 静默修复上游对象。

## 输入

- Topic、Decision、Ticket、Pipeline、Handoff 或 MemoryObject。
- 相关证据包。
- ReviewPolicy。
- 治理权限矩阵。

## 输出

- `ReviewResult`。
- `pass`、`revise` 或 `block`。
- 修订建议。
- 阻塞原因。
- Review 审计事件。

## 功能需求

- `REV-001`：审查结果只允许 `pass`、`revise` 或 `block`。
- `REV-002`：Ticket 准入必须经过 `review_policy.ticket_admission` 声明的审查流程。
- `REV-003`：Step 完成必须经过 `review_policy.step_completion` 声明的审查流程。
- `REV-004`：Logic Review 必须检查目标、Owner、依赖、DAG、冲突处理和推导链是否自洽。
- `REV-005`：Quality Review 必须检查字段完整性、Schema 符合性、证据引用、验收标准、失败处理和 Handoff 可消费性。
- `REV-006`：缺少必填字段时，Quality Review 必须返回 `revise` 并指向最近责任上游。
- `REV-007`：Owner 冲突、循环依赖或结构性边界错误必须返回 `block`。
- `REV-008`：基于历史记忆的结论缺少证据引用时，Quality Review 必须返回 `revise`。
- `REV-009`：召回记忆存在过期、被替代、被 block 或冲突标记时，Review Gate 必须阻止静默下游流转。
- `REV-010`：Session 结论不得自动升级为 System Memory。
- `REV-011`：可复用经验提升为 System Memory 前必须经过 Logic Review、Quality Review 和治理放行。
- `REV-012`：Review Agent 只能写审查结论、阻塞理由、修订建议和放行状态。

## 审查检查项

Logic Review：

- 目标与成功标准一致。
- Owner 唯一。
- 协作边界清晰。
- 输入输出闭合。
- Topic、Decision、Ticket、Pipeline 推导链完整。
- Pipeline 保持 DAG。
- 冲突已裁决。
- 回退条件明确。

Quality Review：

- 必填字段完整。
- 字段命名、类型和枚举符合 Schema。
- 结论有证据支撑。
- 历史记忆结论包含证据引用。
- 验收标准可操作。
- 失败处理明确。
- Handoff 足以让下游直接消费。
- 没有无关信息或不必要能力暴露。

## 验收标准

- 未通过审查的对象不会进入下游。
- 审查结果能明确指出修订 Owner 或阻塞原因。
- Owner 冲突、证据缺失和 Pipeline 环均能被 Review Gate 拦截。
- 记忆提升必须经过治理放行。