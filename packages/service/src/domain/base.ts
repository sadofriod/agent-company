/**
 * 为原始值附加品牌标记，避免不同领域 ID 在类型层被误用。
 */
export type Brand<TValue, TBrand extends string> = TValue & {
  /** 类型品牌，只在编译期参与区分。 */
  readonly __brand: TBrand;
};

export type TeamId = Brand<string, 'TeamId'>;
export type DepartmentId = Brand<string, 'DepartmentId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type TopicId = Brand<string, 'TopicId'>;
export type DecisionId = Brand<string, 'DecisionId'>;
export type TicketId = Brand<string, 'TicketId'>;
export type TicketDraftId = Brand<string, 'TicketDraftId'>;
export type PipelineId = Brand<string, 'PipelineId'>;
export type PipelineStepId = Brand<string, 'PipelineStepId'>;
export type HandoffId = Brand<string, 'HandoffId'>;
export type RuntimeId = Brand<string, 'RuntimeId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;
export type MemoryId = Brand<string, 'MemoryId'>;
export type MemoryProfileId = Brand<string, 'MemoryProfileId'>;
export type CapabilityId = Brand<string, 'CapabilityId'>;
export type ReviewId = Brand<string, 'ReviewId'>;

/** JSON Schema 或业务校验错误对应的字段路径。 */
export type JsonPath = readonly string[];

/**
 * 描述一次结构化校验问题。
 */
export type SchemaIssue = {
  /** 便于程序判断的稳定错误码。 */
  readonly code: string;
  /** 问题发生的对象路径。 */
  readonly path: JsonPath;
  /** 面向开发者的可读错误信息。 */
  readonly message: string;
  /** 可选的修复建议。 */
  readonly suggestion?: string;
};

/**
 * 统一表示成功或失败的校验结果。
 */
export type ValidationResult<TValue> =
  | {
      /** 标记当前校验已通过。 */
      readonly ok: true;
      /** 通过校验后的收窄值。 */
      readonly value: TValue;
    }
  | {
      /** 标记当前校验失败。 */
      readonly ok: false;
      /** 失败时返回的结构化问题列表。 */
      readonly issues: readonly SchemaIssue[];
    };

export enum SourceRefKind {
  Memory = 'memory',
  Document = 'document',
  AuditEvent = 'audit_event',
  StructuredObject = 'structured_object',
}

/**
 * 统一表示外部文档、记忆或结构化对象的来源引用。
 */
export type SourceRef = {
  /** 来源类型。 */
  readonly kind: SourceRefKind;
  /** 来源对象的唯一标识。 */
  readonly id: string;
  /** 面向日志或 UI 展示的标签。 */
  readonly label: string;
};

/**
 * 表示一条证据引用及其可选补充信息。
 */
export type EvidenceRef = {
  /** 证据来源。 */
  readonly source: SourceRef;
  /** 可选的原文摘录。 */
  readonly excerpt?: string;
  /** 可选的置信度评分。 */
  readonly confidence?: number;
};

/**
 * 定义系统中可被引用的核心结构化实体类型。
 */
export const enum EntityType {
  /** 讨论阶段收敛出的主题对象。 */
  Topic = 'topic',
  /** 基于主题形成的结构化决策。 */
  Decision = 'decision',
  /** 待准入审查的票据草稿。 */
  TicketDraft = 'ticket_draft',
  /** 已准入、可执行的正式票据。 */
  Ticket = 'ticket',
  /** 服务单个票据的执行流程。 */
  Pipeline = 'pipeline',
  /** 流程中的单个执行步骤。 */
  PipelineStep = 'pipeline_step',
  /** 步骤之间的结构化交接物。 */
  Handoff = 'handoff',
  /** 审查输出结果。 */
  ReviewResult = 'review_result',
  /** 审计事件对象。 */
  AuditEvent = 'audit_event',
  /** 记忆对象。 */
  MemoryObject = 'memory_object',
}

/**
 * 指向某个结构化领域对象的轻量引用。
 */
export type StructuredObjectRef = {
  /** 被引用对象的实体类型。 */
  readonly objectType: EntityType;
  /** 被引用对象的唯一标识。 */
  readonly objectId: string;
};