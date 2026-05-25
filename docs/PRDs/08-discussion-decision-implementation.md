# Discussion And Decision 设计与实现文档

## 1. 模块边界与架构定位

`Discussion And Decision`（下称讨论与决策）模块属于系统 `runtime/` 编排层的一部分。该模块的核心是将尚未能直接投入生产（Pipeline）的模糊目标，转换为确定范围、明确约束并能够作为执行依据的结构化对象（Topic、Decision、Ticket Draft），同时在 `team.schema.json` 所定义的拓扑下进行决策。

遵循函数式设计理念：
- **无状态核心**：状态变迁通过显式的状态传递推进，不使用大而全的类管理全局状态。
- **纯函数规则判定**：流转规则、验证规则基于输入数据进行纯计算。
- **外部副作用解耦**：所有与 LLM、存储的交互通过外部 Port/Adapter 注入。

## 2. 核心领域类型定义 (Domain Types)

我们使用品牌类型 (Brand Types) 区分不同领域的 ID，以 `type` 作为数据结构基础，避免使用 `any`，保持类型安全。

```typescript
// types/discussion.ts
type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type TopicId = Brand<string, 'TopicId'>;
export type DecisionId = Brand<string, 'DecisionId'>;
export type TicketDraftId = Brand<string, 'TicketDraftId'>;

// 讨论拓扑类型 (遵循 team.schema.json)
export type DiscussionMode = 'supervisor_led' | 'sequential_handoff' | 'parallel_review';

// 输入上下文
export type DiscussionContext = Readonly<{
  originalTask: string;
  runtimePlanConfig: unknown;
  policy: {
    mode: DiscussionMode;
    maxRounds: number;
    supervisor?: string;
  };
  retrievedMemoryIds: readonly string[];
  contextData: unknown; // 根据接入 MemoryRetriever 数据结构补充
}>;

// 输出对象结构
export type TicketDraft = Readonly<{
  id: TicketDraftId;
  topicId: TopicId;
  target: string;
  candidateOwner: string;
  acceptanceCriteria: readonly string[];
  fallbackDraft: string;
}>;

export type Decision = Readonly<{
  id: DecisionId;
  topicId: TopicId;
  ownerString: string;
  conclusion: string;
  reasons: readonly string[];
  references: readonly string[];
  status: 'draft' | 'frozen';
}>;

export type UnresolvedConflict = Readonly<{
  description: string;
  parties: readonly string[];
  recommendedResolver: string;
}>;

export type DiscussionResult = Readonly<{
  topic: {
    id: TopicId;
    title: string;
    description: string;
  } | null;
  decisions: readonly Decision[];
  ticketDrafts: readonly TicketDraft[];
  unresolvedConflicts: readonly UnresolvedConflict[];
  auditEvents: readonly unknown[];
}>;
```

## 3. 核心功能实现设计

### 3.1 讨论进入判定 (DISC-001)

在主运行时，当外部指令下发后，通过轻量级探测函数决定是否进入讨论模式，而非直接创建 Ticket。

```typescript
// runtime/route-work-mode.ts
export const shouldEnterDiscussion = (taskDef: TaskDefinition): boolean => {
  if (!taskDef.target || !taskDef.successCriteria || !taskDef.owner) {
    return true;
  }
  if (hasUnclearDependencies(taskDef)) {
    return true;
  }
  return false;
};
```

### 3.2 讨论拓扑执行与路由 (DISC-002, DISC-003, DISC-004, DISC-005)

拓扑模式在配置（DiscussionPolicy）中声明，各拓扑逻辑收敛于小函数，不改变运行时配置。

```typescript
// runtime/execute-discussion.ts
import { runSupervisorLed } from './topologies/supervisor-led.js';
import { runSequentialHandoff } from './topologies/sequential-handoff.js';
import { runParallelReview } from './topologies/parallel-review.js';

export const executeDiscussion = async (
  context: DiscussionContext,
  llmPort: LLMPort
): Promise<DiscussionResult> => {
  // 根据配置不可变分发
  switch (context.policy.mode) {
    case 'supervisor_led':
      return runSupervisorLed(context, llmPort);
    case 'sequential_handoff':
      return runSequentialHandoff(context, llmPort);
    case 'parallel_review':
      return runParallelReview(context, llmPort);
    default:
      const _exhaustiveCheck: never = context.policy.mode;
      throw new Error(`Unhandled discussion mode`);
  }
};
```

**三种拓扑实现细节：**
- **Supervisor Led** (主管主导): 主循环向 Supervisor 角色请求次级分配或结论，收集 agent 意见至汇总阶段后由 Supervisor 生成最终 Decision (冻结状态)。并解决跨部门/所有者冲突 (DISC-012)。
- **Sequential Handoff** (接力流转): 构造处理队列，每个 Agent 将前一个输出加上本体意见返回下一个实体，直至结束，严禁消费非上游数据。
- **Parallel Review** (并行审阅): 初始化多个 Agent LLM 请求（`Promise.all`），收集到数组后交由 Owner 或 Supervisor 进行 Reduce 操作（聚合聚类）。

### 3.3 轮次控制与停止条件 (DISC-006)

在轮询执行中显式传入 `currentRound`。并在拓扑循环退出条件中检测最大轮次：

```typescript
// runtime/topologies/supervisor-led.js
export const runSupervisorLedLoop = async (
  state: DiscussionState,
  context: DiscussionContext,
  llmPort: LLMPort,
  currentRound: number = 0
): Promise<DiscussionResult> => {
  if (currentRound >= context.policy.maxRounds) {
    return generateFallbackResult(state, 'MAX_ROUNDS_EXCEEDED');
  }
  
  // 1. LLM Evaluation...
  // 2. State transition...
  // 3. Recursive call or return Result
};
```

### 3.4 结构化成果生成 (DISC-007, 008, 009, 010, 011)

对于 LLM 的输出采取严格校验策略。利用 `ajv` 甚至强类型的 Schema 反向约束：

- *Decision 生成*：生成的 Decision 必须附带 `retrievedMemoryIds` 及 Owner 信息（且由该 Owner 或 Supervisor 发起冻结）。
- *Ticket Draft 分拆*：Topic 解析器在识别到多个执行事项后，利用数组结构强制分拆（List of Tickets）。
- 类型校验：所有生成数据流入系统前先经由 Joi/Zod 或 Ajv Schema 进行格式验证。

```typescript
export const validateTicketDrafts = (drafts: unknown[]): TicketDraft[] => {
  // 映射 JSON Schema 规则为验证逻辑 (DISC-011)
  // 如果违规，抛出解析失败或要求 Agent 重试
  return drafts.map(parseToTicketDraft);
};
```

## 4. 依赖端口及边界环境 (Ports)

为了遵循领域隔离并且符合开发习惯，需要隔离出外部依赖。

```typescript
export type LLMPort = {
  chat(messages: MessageList, jsonSchemaResponse?: unknown): Promise<unknown>;
};

export type AuditPort = {
  logEvent(eventId: string, details: object): void;
};
```
上述接口可在底层被具体 LLM Client 和 `pino` Logger 适配器所实现。

## 5. 失败与异常回退 (Failures & Fallbacks)

按业务规则实施：
1. **上下文缺失：**
   当底层 LLM 判断信息由于缺失无法决策时，通过约定的特定格式返回 `REVISE_REQUIRED`，系统随之中断讨论，将错误信息打回给最近 Owner 或求助用户。
2. **达到最大讨论轮次 (Max Rounds)：**
   如 `runSupervisorLedLoop` 中逻辑所示，截断当前执行状态。从上下文中构建由于未决造成的异常项 `UnresolvedConflict`。
3. **冲突解决：**
   检测到 Owner 冲突 (多个主体声称归属) 时，自动路由状态机至「冲突处理分支」，调用 `Review Gate` 服务进行判定，若依旧无定论向上抛出至人工队列，绝不进行静默分配。

## 6. 测试策略与验收要求

针对 `Discussion And Decision`，推荐以下级别的单测与集成验证：

* **核心算法**：使用打桩后的 LLMPort，传入各种模式（`supervisor_led`、`sequential_handoff`、`parallel_review`），验证 `executeDiscussion` 返回的执行拓扑是否正确；
* **Schema 校验校验**：主动向 validator 输入缺少 target/acceptanceCriteria 的不规范 `TicketDraft` 测试是否拦截并抛出错误 (DISC-011)。
* **无限流测试**：将大模型 Port 改写为总是输出争议对话，测试当 `currentRound` == `maxRounds` 时是否能够准确停机并产出包含超时原因的 `UnresolvedConflict` 数组。
