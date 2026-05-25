# TypeScript Technical Design

## 设计目标

本技术方案用于指导 Agents Company MVP 的 TypeScript 实现。目标不是一次性实现所有企业级能力，而是建立一套类型安全、Schema 驱动、可审计、可测试的运行时骨架。

MVP 技术目标：

- Team Schema 作为运行时装配的唯一事实来源。
- TypeScript 类型系统约束核心领域对象和状态流转。
- JSON Schema 校验负责外部配置、结构化输出和跨边界数据的准入。
- Runtime 只执行已声明策略，不在执行中发明新的部门、Agent、Tool 或协作规则。
- Pipeline、Review、Memory、Capability 都通过小型函数和端口适配器组合，便于替换实现。

## 技术栈

### 基础运行时

- Node.js 20 LTS 或更高版本。
- TypeScript 5.x。
- pnpm 作为包管理器。
- ESM 模块格式。

### 核心依赖建议

- `ajv`：执行 Draft 2020-12 JSON Schema 校验。
- `ajv-formats`：补充标准格式校验。
- `tsx`：本地开发执行 TypeScript 脚本。
- `vitest`：单元测试与集成测试。
- `pino`：结构化日志。
- `zod` 可选：仅用于内部开发体验较强的局部运行时解析，不替代 Team Schema。

### 可插拔依赖

- 向量数据库：MVP 可先使用内存实现，后续接入 `pgvector`。
- 图存储：MVP 可先使用本地图邻接表，后续接入图数据库或 Postgres 表结构。
- LLM Provider：通过端口隔离，运行时不直接绑定具体厂商 SDK。
- Tool Runner：通过端口隔离，避免 Agent 直接调用宿主能力。

## TypeScript 编译约束

`tsconfig.json` 应启用严格模式：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

代码规范：

- 优先使用 `type`，除非确实需要声明合并。
- 禁止 `any`，外部输入先进入 `unknown`，通过解析和校验后再收窄。
- 禁止传统 `enum`，使用 `as const` 对象和字面量联合类型。
- 使用 named export，不使用 default export。
- 类型导入使用 `import type`。
- 新增领域对象默认使用 `readonly` 字段。
- 核心逻辑优先写成纯函数，状态变更由运行时协调层集中处理。

## 推荐项目结构

```text
src/
  domain/
    organization.ts
    capability.ts
    delivery.ts
    memory.ts
    review.ts
    runtime.ts
  schema/
    load-team-schema.ts
    validate-team-schema.ts
    generated-types.ts
  runtime/
    create-runtime-plan.ts
    route-work-mode.ts
    execute-discussion.ts
    execute-pipeline.ts
    handle-interruption.ts
  review/
    logic-review.ts
    quality-review.ts
    review-gate.ts
  memory/
    retrieve-memory.ts
    rank-memory.ts
    write-memory.ts
    detect-memory-conflict.ts
  capability/
    resolve-capabilities.ts
    authorize-capability.ts
    tool-runner.ts
  ports/
    llm-port.ts
    tool-port.ts
    memory-store-port.ts
    audit-port.ts
  adapters/
    in-memory/
    node/
  tests/
```

分层原则：

- `domain/` 只包含类型、常量和纯领域规则。
- `schema/` 负责读取、校验和转换 Team Schema。
- `runtime/` 负责编排，不直接实现外部工具、LLM、数据库或文件系统细节。
- `ports/` 定义外部能力接口。
- `adapters/` 实现具体外部依赖。
- `review/`、`memory/`、`capability/` 保持可独立测试。

## 核心类型建模

### ID 与只读对象

领域 ID 使用品牌类型，避免把不同对象 ID 误传：

```typescript
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type TeamId = Brand<string, 'TeamId'>;
export type DepartmentId = Brand<string, 'DepartmentId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type TicketId = Brand<string, 'TicketId'>;
export type PipelineId = Brand<string, 'PipelineId'>;
export type PipelineStepId = Brand<string, 'PipelineStepId'>;
```

外部 JSON 进入系统时仍是普通字符串，只有通过校验和构造函数后才转为品牌类型。

### 策略枚举

```typescript
export const DiscussionMode = {
  SupervisorLed: 'supervisor_led',
  SequentialHandoff: 'sequential_handoff',
  ParallelReview: 'parallel_review'
} as const;

export type DiscussionMode = typeof DiscussionMode[keyof typeof DiscussionMode];

export const ReviewStatus = {
  Pass: 'pass',
  Revise: 'revise',
  Block: 'block'
} as const;

export type ReviewStatus = typeof ReviewStatus[keyof typeof ReviewStatus];
```

### 结构化交付对象

```typescript
export type Topic = {
  readonly topicId: string;
  readonly goal: string;
  readonly constraints: readonly string[];
  readonly participantDepartmentIds: readonly DepartmentId[];
  readonly expectedOutputs: readonly string[];
};

export type Decision = {
  readonly decisionId: string;
  readonly topicId: string;
  readonly ownerDepartmentId: DepartmentId;
  readonly conclusion: string;
  readonly rationale: string;
  readonly sourceRefs: readonly string[];
};

export type Ticket = {
  readonly ticketId: TicketId;
  readonly ownerAgentId: AgentId;
  readonly goal: string;
  readonly inputContract: string;
  readonly outputContract: string;
  readonly acceptanceCriteria: readonly string[];
  readonly failurePolicy: string;
  readonly derivedFromDecisionIds: readonly string[];
};
```

MVP 中领域对象应尽量保持扁平。复杂关系通过 ID 引用表达，不在对象内部嵌套完整下游对象，避免隐式上下文膨胀。

## Schema 加载与校验

### 加载流程

1. 读取 Team Schema JSON。
2. 使用 Ajv 校验 `schemas/team.schema.json`。
3. 执行引用完整性校验，包括部门引用、Agent 引用、Supervisor 引用和 Memory Profile 引用。
4. 生成 `TeamDefinition`。
5. 创建 `RuntimePlan`。

JSON Schema 只能校验字段形状，不能覆盖跨字段业务规则。跨字段规则应由纯函数补充：

```typescript
export type SchemaIssue = {
  readonly code: string;
  readonly path: readonly string[];
  readonly message: string;
};

export type ValidationResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly issues: readonly SchemaIssue[] };
```

推荐补充校验：

- 每个 `department.agents` 必须引用已声明 Agent。
- 每个 Agent 的 `department_id` 必须引用已声明 Department。
- `discussion_policy.supervisor_agent_id` 如果存在，必须引用已声明 Agent。
- `memory_access_policy` 如果存在，必须引用已声明 Retrieval Profile。
- `team_id`、`department_id`、`agent_id` 在各自范围内唯一。

## Runtime 装配

`RuntimePlan` 是运行时执行前的中间计划，用于冻结本次任务可用的组织、能力和策略。

```typescript
export type RuntimePlan = {
  readonly team: TeamDefinition;
  readonly departmentsById: ReadonlyMap<DepartmentId, Department>;
  readonly agentsById: ReadonlyMap<AgentId, AgentDefinition>;
  readonly discussionPolicy: DiscussionPolicy;
  readonly pipelinePolicy: PipelinePolicy;
  readonly memoryPolicy?: MemoryPolicy;
  readonly reviewPolicy: ReviewPolicy;
};
```

装配原则：

- 运行时只消费 `RuntimePlan`，不直接消费原始 JSON。
- `RuntimePlan` 创建后视为不可变。
- 每次任务执行基于同一个 `RuntimePlan` 创建独立 `ExecutionContext`。
- `ExecutionContext` 保存 task、trace、audit、memory scope 和当前工作模式。

## 工作模式路由

路由函数根据用户输入、结构化对象完整度和审查结果选择模式。

```typescript
export const WorkMode = {
  Discussion: 'discussion',
  Pipeline: 'pipeline'
} as const;

export type WorkMode = typeof WorkMode[keyof typeof WorkMode];

export type WorkModeDecision = {
  readonly mode: WorkMode;
  readonly reason: string;
  readonly requiredObjects: readonly string[];
};
```

路由规则：

- 任务目标不清晰或需要跨部门决策时进入讨论模式。
- 已有 Ticket 且通过准入审查时进入 Pipeline 模式。
- Pipeline 中发现 Owner 冲突、能力缺口、DAG 破坏或新增跨部门决策时回退讨论模式。

## Pipeline DAG 执行

Pipeline 必须属于单个 Ticket。每个 Step 明确 Owner、依赖、输入输出和授权能力。

```typescript
export type PipelineStep = {
  readonly stepId: PipelineStepId;
  readonly ticketId: TicketId;
  readonly ownerAgentId: AgentId;
  readonly dependsOn: readonly PipelineStepId[];
  readonly inputContract: string;
  readonly outputContract: string;
  readonly allowedCapabilities: readonly string[];
  readonly reviewRequired: boolean;
};

export type Pipeline = {
  readonly pipelineId: PipelineId;
  readonly ticketId: TicketId;
  readonly steps: readonly PipelineStep[];
};
```

DAG 校验应在执行前完成：

- 所有依赖 Step 必须存在。
- 不允许循环依赖。
- 不允许跨 Ticket Step 混入同一 Pipeline。
- 每个 Step 必须有唯一 Owner Agent。
- Step 的能力必须是 Agent、Schema 和当前上下文共同允许的交集。

执行策略：

1. 拓扑排序得到可执行批次。
2. 同一批次内无依赖冲突的 Step 可以并行执行。
3. 每个 Step 执行前解析最小能力集合。
4. Step 输出进入 Review Gate。
5. Review `pass` 后生成 Handoff。
6. Review `revise` 回退最近责任上游。
7. Review `block` 中断 Pipeline 并触发模式回退。

## Capability 解析与授权

Capability 由四个来源共同决定：

- Team Schema 声明的 Agent 能力。
- Department 的职责边界。
- 当前工作模式。
- Pipeline Step 的 `allowed_capabilities`。

解析结果应包含加载理由，便于审计：

```typescript
export type CapabilityGrant = {
  readonly capabilityId: string;
  readonly capabilityType: 'skill' | 'mcp_server' | 'tool';
  readonly grantedToAgentId: AgentId;
  readonly grantedForStepId?: PipelineStepId;
  readonly reason: string;
  readonly sourceRefs: readonly string[];
};
```

禁止 Agent 自行扩大能力范围。任何未授权能力请求都必须返回结构化失败，而不是由模型编造结果。

## Memory 与 RAG 端口

Memory Layer 不直接把历史内容拼进上下文。它先执行治理过滤，再检索、重排、证据打包。

```typescript
export type MemoryQuery = {
  readonly requesterAgentId: AgentId;
  readonly scope: 'system' | 'session' | 'topic' | 'ticket';
  readonly query: string;
  readonly profileId: string;
  readonly ticketId?: TicketId;
  readonly topicId?: string;
};

export type RetrievedMemory = {
  readonly memoryId: string;
  readonly content: string;
  readonly score: number;
  readonly sourceRefs: readonly string[];
  readonly reviewed: boolean;
  readonly conflictIds: readonly string[];
};
```

检索流程：

1. 根据 Retrieval Profile 检查 Scope 权限。
2. 执行向量召回。
3. GraphRAG 模式下沿对象关系做 1 到 2 跳扩展。
4. 重排并截断到 `max_results`。
5. 标记过期、被替代、冲突和未审查记忆。
6. 输出必须附带 `sourceRefs` 或 `retrieved_memory_ids`。

## Review Gate 实现

Review Gate 是结构化对象继续流转的唯一出口。

```typescript
export type ReviewTargetType = 'topic' | 'decision' | 'ticket' | 'pipeline' | 'handoff' | 'step_output';

export type ReviewRequest<TTarget> = {
  readonly targetType: ReviewTargetType;
  readonly target: TTarget;
  readonly context: ExecutionContext;
};

export type ReviewResult = {
  readonly status: ReviewStatus;
  readonly reviewer: 'logic_review' | 'quality_review';
  readonly issues: readonly ReviewIssue[];
  readonly evidenceRefs: readonly string[];
};
```

Review Gate 应先执行逻辑审查，再执行质量审查：

- 逻辑审查失败通常返回 `block`。
- 质量审查失败通常返回 `revise`。
- 缺少证据、字段缺失、Handoff 不可消费时返回 `revise`。
- Owner 冲突、DAG 循环、能力越权、记忆冲突未裁决时返回 `block`。

## 错误模型

运行时错误使用判别联合表达，不抛出裸异常穿透业务层。

```typescript
export type RuntimeError =
  | { readonly kind: 'schema_invalid'; readonly issues: readonly SchemaIssue[] }
  | { readonly kind: 'capability_missing'; readonly capabilityId: string; readonly agentId: AgentId }
  | { readonly kind: 'review_blocked'; readonly result: ReviewResult }
  | { readonly kind: 'pipeline_cycle_detected'; readonly pipelineId: PipelineId }
  | { readonly kind: 'memory_access_denied'; readonly profileId: string; readonly scope: string };
```

应用层可以把 `RuntimeError` 转换为用户可读结果、审计事件或回退动作。

## 审计事件

每次关键状态变化都写入审计流：

- Team Schema 加载与校验结果。
- Agent、Skill、MCP、Tool 的加载理由。
- Discussion 轮次、参与者和输出对象。
- Review Gate 的输入、结论和问题列表。
- Pipeline Step 开始、完成、中断和回退。
- Memory 检索范围、证据引用和冲突标记。

审计事件不应保存未授权原文上下文，只保存必要字段、对象 ID、原因和证据引用。

## 测试策略

### 单元测试

- Schema 引用完整性校验。
- Discussion mode 路由。
- Ticket 准入审查。
- Pipeline DAG 校验。
- Capability 交集解析。
- Memory scope 过滤。
- Review Gate 状态映射。

### 集成测试

- 使用 `examples/software-delivery-team.json` 创建 RuntimePlan。
- 对同一任务切换 `supervisor_led`、`sequential_handoff`、`parallel_review`。
- 构造 Owner 冲突、字段缺失、Pipeline 循环、能力缺失和记忆冲突案例。

### 契约测试

- Team Schema 示例必须通过 JSON Schema 校验。
- 结构化输出必须能被 Review Gate 消费。
- Handoff 必须满足下游 Step 的输入契约。

## MVP 里程碑

### Milestone 1: Schema Runtime

- 实现 Team Schema 读取和 Ajv 校验。
- 实现跨字段引用完整性校验。
- 生成不可变 RuntimePlan。

### Milestone 2: Discussion And Ticket

- 实现工作模式路由。
- 实现 DiscussionPolicy 执行骨架。
- 输出 Topic、Decision 和 Ticket Draft。
- 接入 Ticket Admission Review。

### Milestone 3: Pipeline Execution

- 实现单 Ticket Pipeline。
- 实现 DAG 校验和拓扑执行。
- 实现 Step Review、Handoff 和中断处理。

### Milestone 4: Memory And Governance

- 实现 Memory Retrieval Profile 权限过滤。
- 实现内存向量检索占位适配器。
- 实现证据引用和冲突标记。

### Milestone 5: Observability And Tests

- 实现结构化审计事件。
- 补齐 MVP 测试计划中的核心失败场景。
- 输出可复盘的执行报告。

## 非目标

- MVP 不绑定某个具体 LLM SDK。
- MVP 不实现完整企业权限系统，只实现 Schema 和 Profile 层面的最小治理。
- MVP 不要求一开始接入真实向量数据库或图数据库。
- MVP 不支持 Agent 自由发现和注册新工具。
- MVP 不追求复杂 UI，优先保证运行时和结构化对象稳定。

## 放行标准

- 更换 Team Schema 后，不改运行时代码即可改变部门、Agent 和讨论方式。
- 所有外部输入都经过 Schema 或解析函数收窄。
- Pipeline Cycle、Owner Conflict、Capability Missing、Memory Scope Pollution 都有自动化测试覆盖。
- 每个 Review Result 都能解释 `pass`、`revise` 或 `block` 的原因。
- 每次能力加载和记忆检索都有审计记录。
- TypeScript 编译通过严格模式，不使用 `any` 和 default export。