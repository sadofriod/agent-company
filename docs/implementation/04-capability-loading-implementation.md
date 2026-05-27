# Capability Loading Implementation

## 实现目标

Capability Loading 模块按 Team Schema、Agent 声明、工作模式和 Pipeline Step 上下文解析 Skill、MCP Server 和 Tool。能力加载必须最小化、可审计、可撤销，并且不能由 Agent 在运行中自行扩大。

## 源文档

- [../requirements/04-capability-loading-requirements.md](../requirements/04-capability-loading-requirements.md)
- [../PRDs/03-json-schema-driven-loading.md](../PRDs/03-json-schema-driven-loading.md)
- [../PRDs/07-typescript-technical-design.md](../PRDs/07-typescript-technical-design.md)

## 责任边界

本模块只负责能力解析、授权、加载计划和审计。具体 Tool 行为由 Tool Port 和 Adapter 实现，业务 Owner 裁决由 Discussion 或 Review 完成。

## 推荐文件

```text
src/domain/capability.ts
src/capability/resolveCapabilities.ts
src/capability/authorizeCapability.ts
src/capability/createCapabilityLoadPlan.ts
src/capability/toolRunner.ts
src/ports/toolPort.ts
src/ports/auditPort.ts
```

## 核心类型

- `CapabilityType`：`skill`、`mcp_server` 或 `tool`。
- `CapabilityRegistry`：运行时可用能力注册表，保存能力 ID、类型和可用状态。
- `CapabilityRequest`：当前 Agent、scope、Step 和目标对象提出的能力请求。
- `CapabilityGrant`：已授权能力，包含授权对象、原因、来源和失效条件。
- `CapabilityLoadPlan`：一次执行上下文中要加载的最小能力集合。

## 授权来源

能力授权由四个来源取交集：Team Schema 中 Agent 声明的能力、Department 决策边界、当前工作模式、Pipeline Step 的 `allowed_capabilities`。任一来源不允许时，能力请求必须失败。

## 核心流程

1. `resolveCapabilities` 从 AgentDefinition、PipelineStep 和当前 scope 得到候选能力。
2. `authorizeCapability` 检查候选能力是否同时被 Agent、Step、Schema 和工作模式允许。
3. 检查 CapabilityRegistry，确认能力真实存在且当前可用。
4. 对缺失能力返回 `capability_missing`，对越权能力返回 `capability_denied`。
5. `createCapabilityLoadPlan` 输出最小能力集合、加载理由和失效条件。
6. Runtime 根据 LoadPlan 加载能力，并写入审计事件。

## 加载作用域

MVP 至少支持三个 scope：`discussion`、`pipeline_step` 和 `review`。Discussion scope 只加载讨论所需 Skill 或只读工具；Pipeline Step scope 加载当前步骤最小能力；Review scope 只加载审查所需能力，不加载执行 Tool 修改下游对象。

## 失效策略

能力授权必须包含 `expires_when`。常见值包括 `step_completed`、`review_completed`、`discussion_completed` 和 `runtime_completed`。Step 结束后应撤销 Step 级能力，避免后续步骤复用过宽权限。

## 错误与审计

能力缺失和授权失败不得降级为普通警告。审计事件包含 `event_type`、`runtime_id`、`agent_id`、`scope`、`target_id`、`capability_type`、`capability_id`、`reason` 和 `expires_when`。

## 测试建议

- Agent 未声明但 Step 请求 Tool，确认返回 `capability_denied`。
- Schema 声明能力但 Registry 不存在，确认返回 `capability_missing`。
- Step Executor 请求超出当前 Step 的能力，确认被拒绝。
- Review Agent 请求执行 Tool，确认被拒绝。
- 成功加载能力时，确认审计事件能解释原因和失效条件。
