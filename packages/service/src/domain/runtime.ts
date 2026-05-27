import type {
  AgentId,
  AuditEventId,
  DepartmentId,
  PipelineId,
  RuntimeId,
  SchemaIssue,
  TeamId,
  TicketId,
} from './base';
import type { DiscussionResult } from './discussion';
import type { Pipeline, PipelineInterruption, StepResult, Ticket } from './delivery';
import type { MemoryContextPackage } from './memory';
import type {
  AgentDefinition,
  Department,
  DiscussionPolicy,
  MemoryPolicy,
  MemoryScope,
  PipelinePolicy,
  TeamDefinition,
} from './organization';
import type { ReviewPolicy, ReviewResult } from './review';

/** 定义运行时支持的工作模式。 */
export const WORK_MODE = {
  Discussion: 'discussion',
  Pipeline: 'pipeline',
} as const;

/** 工作模式类型。 */
export type WorkMode = typeof WORK_MODE[keyof typeof WORK_MODE];

/**
 * 表示 Team Schema 装配完成后的不可变运行计划。
 */
export type RuntimePlan = {
  /** 原始团队定义。 */
  readonly team: TeamDefinition;
  /** 部门索引。 */
  readonly departmentsById: ReadonlyMap<DepartmentId, Department>;
  /** Agent 索引。 */
  readonly agentsById: ReadonlyMap<AgentId, AgentDefinition>;
  /** 讨论策略。 */
  readonly discussionPolicy: DiscussionPolicy;
  /** Pipeline 策略。 */
  readonly pipelinePolicy: PipelinePolicy;
  /** 可选记忆策略。 */
  readonly memoryPolicy?: MemoryPolicy;
  /** 审查策略。 */
  readonly reviewPolicy: ReviewPolicy;
};

/**
 * 表示工作模式路由结果。
 */
export type WorkModeDecision = {
  /** 当前应进入的模式。 */
  readonly mode: WorkMode;
  /** 做出该路由决定的原因。 */
  readonly reason: string;
  /** 进入该模式前必须具备的对象。 */
  readonly requiredObjects: readonly string[];
};

/**
 * 表示一次用户任务输入。
 */
export type RuntimeTask = {
  /** 任务标题。 */
  readonly title: string;
  /** 用户希望达成的目标。 */
  readonly goal: string;
  /** 任务执行约束。 */
  readonly constraints: readonly string[];
  /** 任务请求方标识。 */
  readonly requesterId?: string;
};

/**
 * 表示单次运行过程中的上下文快照。
 */
export type ExecutionContext = {
  /** 当前运行实例 ID。 */
  readonly runtimeId: RuntimeId;
  /** 当前处理的任务。 */
  readonly task: RuntimeTask;
  /** 用于链路追踪的 trace ID。 */
  readonly traceId: string;
  /** 当前运行绑定的团队 ID。 */
  readonly teamId: TeamId;
  /** 当前工作模式。 */
  readonly currentMode: WorkMode;
  /** 当前活跃 Agent。 */
  readonly currentAgentId?: AgentId;
  /** 当前活跃 Ticket。 */
  readonly activeTicketId?: TicketId;
  /** 已记录的审计轨迹。 */
  readonly auditTrail: readonly AuditEvent[];
  /** 当前允许使用的记忆作用域。 */
  readonly memoryScopes: readonly MemoryScope[];
};

/**
 * 表示运行时在某一时刻的组合状态。
 */
export type RuntimeState = {
  /** 当前执行上下文。 */
  readonly context: ExecutionContext;
  /** 当前模式决策。 */
  readonly workModeDecision: WorkModeDecision;
  /** 最近一次讨论结果。 */
  readonly discussionResult?: DiscussionResult;
  /** 当前激活的 Ticket。 */
  readonly activeTicket?: Ticket;
  /** 当前激活的 Pipeline。 */
  readonly activePipeline?: Pipeline;
  /** 最近一次 Step 结果。 */
  readonly latestStepResult?: StepResult;
  /** 最近一次审查结果。 */
  readonly latestReviewResult?: ReviewResult;
  /** 最近一次记忆检索包。 */
  readonly latestMemoryPackage?: MemoryContextPackage;
  /** 最近一次中断信息。 */
  readonly interruption?: PipelineInterruption;
  /** 运行时建议的下一步动作。 */
  readonly nextAction: string;
};

/**
 * 统一的运行时错误基类字段。
 */
export type RuntimeErrorBase = {
  /** 稳定错误码。 */
  readonly code: string;
  /** 面向上层和审计的可读信息。 */
  readonly message: string;
  /** 触发错误的目标对象类型。 */
  readonly targetType?: string;
  /** 触发错误的目标对象 ID。 */
  readonly targetId?: string;
  /** 建议的恢复动作。 */
  readonly suggestedAction?: string;
};

/**
 * 统一表示运行时可返回的结构化错误。
 */
export type RuntimeError =
  | (RuntimeErrorBase & {
      /** Schema 结构校验失败。 */
      readonly kind: 'schema_invalid';
      /** 具体问题列表。 */
      readonly issues: readonly SchemaIssue[];
    })
  | (RuntimeErrorBase & {
      /** 跨字段引用校验失败。 */
      readonly kind: 'reference_invalid';
      /** 具体问题列表。 */
      readonly issues: readonly SchemaIssue[];
    })
  | (RuntimeErrorBase & {
      /** 请求的能力在注册表中不存在。 */
      readonly kind: 'capability_missing';
      /** 缺失的能力 ID。 */
      readonly capabilityId: string;
      /** 请求该能力的 Agent。 */
      readonly agentId: AgentId;
    })
  | (RuntimeErrorBase & {
      /** 请求的能力未被授权。 */
      readonly kind: 'capability_denied';
      /** 被拒绝的能力 ID。 */
      readonly capabilityId: string;
      /** 发起请求的 Agent。 */
      readonly agentId: AgentId;
    })
  | (RuntimeErrorBase & {
      /** 审查阻塞了流程继续。 */
      readonly kind: 'review_block';
      /** 对应的审查结果。 */
      readonly result: ReviewResult;
    })
  | (RuntimeErrorBase & {
      /** 审查要求回到上游修订。 */
      readonly kind: 'review_revise';
      /** 对应的审查结果。 */
      readonly result: ReviewResult;
    })
  | (RuntimeErrorBase & {
      /** Ticket 准入审查失败。 */
      readonly kind: 'ticket_admission_failed';
      /** 对应的审查结果。 */
      readonly result: ReviewResult;
    })
  | (RuntimeErrorBase & {
      /** Pipeline 被检测出存在环。 */
      readonly kind: 'pipeline_cycle_detected';
      /** 发生问题的 Pipeline。 */
      readonly pipelineId: PipelineId;
    })
  | (RuntimeErrorBase & {
      /** 当前 profile 无权访问目标记忆范围。 */
      readonly kind: 'memory_access_denied';
      /** 触发拒绝的 profile。 */
      readonly profileId: string;
      /** 被拒绝的作用域。 */
      readonly scope: string;
    })
  | (RuntimeErrorBase & {
      /** 召回结果中存在未解决的记忆冲突。 */
      readonly kind: 'memory_conflict';
      /** 冲突对象集合。 */
      readonly conflicts: readonly string[];
    })
  | (RuntimeErrorBase & {
      /** 讨论达到最大轮次仍未收敛。 */
      readonly kind: 'discussion_max_rounds_reached';
      /** 最近一次讨论结果。 */
      readonly result: DiscussionResult;
    });

/**
 * 表示一条可审计的运行事件。
 */
export type AuditEvent = {
  /** 审计事件唯一标识。 */
  readonly eventId: AuditEventId;
  /** 事件类型。 */
  readonly eventType: string;
  /** 所属运行实例。 */
  readonly runtimeId: RuntimeId;
  /** 相关 Agent。 */
  readonly agentId?: AgentId;
  /** 相关目标对象 ID。 */
  readonly targetId?: string;
  /** 相关目标对象类型。 */
  readonly targetType?: string;
  /** 事件产生原因。 */
  readonly reason: string;
  /** 与事件相关的证据引用。 */
  readonly evidenceRefs: readonly string[];
  /** 事件发生时间。 */
  readonly timestamp: string;
  /** 可选附加元数据。 */
  readonly metadata?: Readonly<Record<string, unknown>>;
};