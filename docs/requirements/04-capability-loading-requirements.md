# Capability Loading Requirements

## 模块目标

Capability Loading 模块负责按 Schema、Agent、工作模式和 Pipeline Step 上下文解析并授权 Skill、MCP Server 和 Tool。能力加载必须最小化、可审计、可撤销。

## 范围

本模块包含：

- Agent 声明能力解析。
- Step 所需能力解析。
- 能力存在性检查。
- 能力授权判断。
- 能力加载与过期策略。
- 能力加载审计。

本模块不负责：

- 实现具体 Tool 行为。
- 替代业务 Owner 做决策。
- 因能力缺失而编造执行结果。

## 输入

- AgentDefinition。
- PipelineStep。
- RuntimePlan。
- 当前工作模式。
- 可用 Skill、MCP 和 Tool 注册表。

## 输出

- `CapabilityLoadPlan`。
- `CapabilityLoaded` 审计事件。
- `capability_missing` 或 `capability_denied` 错误。

## 功能需求

- `CAP-001`：系统必须支持按需加载 Skill、MCP Server 和 Tool。
- `CAP-002`：能力只能在当前 Agent、当前 Step 和当前 Team Schema 都允许时加载。
- `CAP-003`：能力加载必须绑定明确作用域，例如 discussion、pipeline_step 或 review。
- `CAP-004`：能力加载必须包含过期条件，例如 step_completed 或 runtime_completed。
- `CAP-005`：Schema 声明的能力不存在时，运行时必须中断并报告 `capability_missing`。
- `CAP-006`：Agent 未声明但 Step 请求的能力必须被拒绝，除非治理策略显式允许派生能力。
- `CAP-007`：Review Agent 只能加载审查所需能力，不能加载执行 Tool 直接修改下游对象。
- `CAP-008`：Step Executor 只能加载完成当前步骤所需的最小能力集合。
- `CAP-009`：能力加载结果必须写入结构化审计事件。
- `CAP-010`：能力授权失败不得被降级为普通警告。

## 审计事件字段

- `event_type`
- `runtime_id`
- `agent_id`
- `scope`
- `target_id`
- `capability_type`
- `capability_id`
- `reason`
- `expires_when`

## 验收标准

- 未授权 Tool 无法被 Step Executor 使用。
- 不存在的能力会中断步骤并返回 `capability_missing`。
- 每次 Agent、Skill、MCP 和 Tool 加载都有结构化审计记录。
- 审计记录能解释加载原因和失效条件。