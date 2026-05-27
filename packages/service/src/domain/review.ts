import type { AgentId, EvidenceRef, ReviewId, SourceRef } from './base';
import type { MemoryScope } from './organization';
import type { ExecutionContext } from './runtime';

/** 定义审查结果状态。 */
export const REVIEW_STATUS = {
  Pass: 'pass',
  Revise: 'revise',
  Block: 'block',
} as const;

/** 审查结果状态类型。 */
export type ReviewStatus = typeof REVIEW_STATUS[keyof typeof REVIEW_STATUS];

/** 定义系统支持的审查器类型。 */
export const REVIEWER_KIND = {
  LogicReview: 'logic_review',
  QualityReview: 'quality_review',
} as const;

/** 审查器类型。 */
export type ReviewerKind = typeof REVIEWER_KIND[keyof typeof REVIEWER_KIND];

/** 定义可进入 Review Gate 的目标对象类型。 */
export const REVIEW_TARGET_TYPE = {
  Topic: 'topic',
  Decision: 'decision',
  Ticket: 'ticket',
  Pipeline: 'pipeline',
  Handoff: 'handoff',
  StepOutput: 'step_output',
  MemoryObject: 'memory_object',
} as const;

/** 审查目标类型。 */
export type ReviewTargetType =
  typeof REVIEW_TARGET_TYPE[keyof typeof REVIEW_TARGET_TYPE];

/**
 * 描述运行时的审查策略配置。
 */
export type ReviewPolicy = {
  /** Ticket 准入阶段需要执行的审查列表。 */
  readonly ticketAdmission: readonly ReviewerKind[];
  /** Step 完成阶段需要执行的审查列表。 */
  readonly stepCompletion: readonly ReviewerKind[];
  /** 允许输出的审查结论集合。 */
  readonly allowedResults: readonly ReviewStatus[];
};

/**
 * 表示单条审查问题。
 */
export type ReviewIssue = {
  /** 出问题的字段或逻辑区域。 */
  readonly field: string;
  /** 问题严重等级。 */
  readonly severity: ReviewStatus;
  /** 问题描述。 */
  readonly message: string;
  /** 建议负责修复的 Agent。 */
  readonly suggestedOwnerAgentId?: AgentId;
};

/**
 * 表示一次针对目标对象的审查请求。
 */
export type ReviewRequest<TTarget> = {
  /** 被审查对象类型。 */
  readonly targetType: ReviewTargetType;
  /** 被审查对象。 */
  readonly target: TTarget;
  /** 当前执行上下文。 */
  readonly context: ExecutionContext;
  /** 附带的证据包。 */
  readonly evidencePackage?: readonly EvidenceRef[];
};

/**
 * 表示一次审查执行后的结构化结果。
 */
export type ReviewResult = {
  /** 审查结果唯一标识。 */
  readonly reviewId: ReviewId;
  /** 审查结论。 */
  readonly status: ReviewStatus;
  /** 产出结论的审查器。 */
  readonly reviewer: ReviewerKind;
  /** 发现的问题列表。 */
  readonly issues: readonly ReviewIssue[];
  /** 审查引用的证据。 */
  readonly evidenceRefs: readonly SourceRef[];
  /** 被审查目标 ID。 */
  readonly targetId: string;
  /** 被审查目标类型。 */
  readonly targetType: ReviewTargetType;
};

/**
 * 表示一次治理放行或拒绝决策。
 */
export type GovernanceDecision = {
  /** 治理结论。 */
  readonly status: ReviewStatus;
  /** 原始作用域。 */
  readonly sourceScope: MemoryScope;
  /** 目标作用域。 */
  readonly targetScope: MemoryScope;
  /** 决策原因。 */
  readonly reason: string;
  /** 支撑治理决策的证据。 */
  readonly evidenceRefs: readonly SourceRef[];
};