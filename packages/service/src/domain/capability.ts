import type {
  AgentId,
  CapabilityId,
  PipelineStepId,
  SourceRef,
} from './base';

/**
 * 定义运行时支持的能力类别。
 */
export const CAPABILITY_TYPE = {
  Skill: 'skill',
  McpServer: 'mcp_server',
  Tool: 'tool',
} as const;

/** 可被授权的能力类型字面量联合。 */
export type CapabilityType =
  typeof CAPABILITY_TYPE[keyof typeof CAPABILITY_TYPE];

/**
 * 定义能力生效的运行时作用域。
 */
export const CAPABILITY_SCOPE = {
  Discussion: 'discussion',
  PipelineStep: 'pipeline_step',
  Review: 'review',
} as const;

/** 能力授权的作用域类型。 */
export type CapabilityScope =
  typeof CAPABILITY_SCOPE[keyof typeof CAPABILITY_SCOPE];

/**
 * 定义能力授权的失效时机。
 */
export const CAPABILITY_EXPIRY = {
  StepCompleted: 'step_completed',
  ReviewCompleted: 'review_completed',
  DiscussionCompleted: 'discussion_completed',
  RuntimeCompleted: 'runtime_completed',
} as const;

/** 能力授权的失效条件。 */
export type CapabilityExpiry =
  typeof CAPABILITY_EXPIRY[keyof typeof CAPABILITY_EXPIRY];

/**
 * 描述注册表中的单个能力。
 */
export type CapabilityDescriptor = {
  /** 能力的唯一标识。 */
  readonly capabilityId: CapabilityId;
  /** 能力类别。 */
  readonly capabilityType: CapabilityType;
  /** 当前运行时中是否可用。 */
  readonly available: boolean;
  /** 对能力用途的可选说明。 */
  readonly description?: string;
};

/**
 * 运行时能力注册表。
 */
export type CapabilityRegistry = {
  /** 以能力 ID 建立的只读索引。 */
  readonly capabilities: ReadonlyMap<CapabilityId, CapabilityDescriptor>;
};

/**
 * 表示某个 Agent 在特定上下文下发起的能力请求。
 */
export type CapabilityRequest = {
  /** 请求能力的 Agent。 */
  readonly agentId: AgentId;
  /** 能力请求所在的作用域。 */
  readonly scope: CapabilityScope;
  /** 请求面向的目标对象 ID。 */
  readonly targetId: string;
  /** 本次希望获得的能力集合。 */
  readonly requestedCapabilityIds: readonly CapabilityId[];
  /** Pipeline Step 级请求时对应的步骤 ID。 */
  readonly stepId?: PipelineStepId;
  /** 请求原因，便于审计和排障。 */
  readonly reason: string;
};

/**
 * 表示通过治理校验后授予的一项能力。
 */
export type CapabilityGrant = {
  /** 获得授权的能力 ID。 */
  readonly capabilityId: CapabilityId;
  /** 授权能力的类别。 */
  readonly capabilityType: CapabilityType;
  /** 被授予能力的 Agent。 */
  readonly grantedToAgentId: AgentId;
  /** 如果是步骤级授权，对应的步骤 ID。 */
  readonly grantedForStepId?: PipelineStepId;
  /** 授权生效的作用域。 */
  readonly scope: CapabilityScope;
  /** 授权理由。 */
  readonly reason: string;
  /** 支撑授权的来源引用。 */
  readonly sourceRefs: readonly SourceRef[];
  /** 授权何时失效。 */
  readonly expiresWhen: CapabilityExpiry;
};

/**
 * 汇总某次执行需要加载的最小能力集合。
 */
export type CapabilityLoadPlan = {
  /** 本次加载计划所属作用域。 */
  readonly scope: CapabilityScope;
  /** 加载计划绑定的目标对象 ID。 */
  readonly targetId: string;
  /** 已通过校验的授权结果。 */
  readonly grants: readonly CapabilityGrant[];
  /** 被拒绝或不存在的能力 ID。 */
  readonly deniedCapabilityIds: readonly CapabilityId[];
};