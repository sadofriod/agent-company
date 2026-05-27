import type {
  AgentId,
  EvidenceRef,
  MemoryId,
  PipelineId,
  SourceRef,
  TicketId,
  TopicId,
} from './base';
import type {
  IndexedObjectType,
  MemoryConflictStrategy,
  MemoryRetrievalProfile,
  MemoryScope,
  RetrievalMode,
} from './organization';

/** 定义可写入记忆层的对象类型。 */
export const MEMORY_OBJECT_TYPE = {
  MemoryObject: 'memory_object',
  Topic: 'topic',
  Decision: 'decision',
  Ticket: 'ticket',
  Pipeline: 'pipeline',
  Handoff: 'handoff',
  ReviewResult: 'review_result',
  AuditEvent: 'audit_event',
} as const;

/** 记忆对象类型。 */
export type MemoryObjectType =
  typeof MEMORY_OBJECT_TYPE[keyof typeof MEMORY_OBJECT_TYPE];

/** 定义记忆对象的可见性范围。 */
export const MEMORY_VISIBILITY = {
  Private: 'private',
  Team: 'team',
  Department: 'department',
} as const;

/** 记忆可见性类型。 */
export type MemoryVisibility =
  typeof MEMORY_VISIBILITY[keyof typeof MEMORY_VISIBILITY];

/** 定义记忆对象的审查状态。 */
export const MEMORY_REVIEW_STATE = {
  Pending: 'pending',
  Reviewed: 'reviewed',
  Blocked: 'blocked',
  Expired: 'expired',
} as const;

/** 记忆审查状态类型。 */
export type MemoryReviewState =
  typeof MEMORY_REVIEW_STATE[keyof typeof MEMORY_REVIEW_STATE];

/** 定义记忆是否已进入索引。 */
export const MEMORY_EMBEDDING_STATUS = {
  Pending: 'pending',
  Indexed: 'indexed',
  Failed: 'failed',
} as const;

/** 记忆索引状态类型。 */
export type MemoryEmbeddingStatus =
  typeof MEMORY_EMBEDDING_STATUS[keyof typeof MEMORY_EMBEDDING_STATUS];

/** 定义 GraphRAG 中使用的边类型。 */
export const MEMORY_GRAPH_EDGE = {
  DerivedFrom: 'DERIVED_FROM',
  References: 'REFERENCES',
  Contradicts: 'CONTRADICTS',
  Supersedes: 'SUPERSEDES',
} as const;

/** 记忆图边类型。 */
export type MemoryGraphEdgeType =
  typeof MEMORY_GRAPH_EDGE[keyof typeof MEMORY_GRAPH_EDGE];

/**
 * 表示一条经过治理控制的记忆事实。
 */
export type MemoryObject = {
  /** 记忆唯一标识。 */
  readonly memoryId: MemoryId;
  /** 该记忆对应的结构化对象类型。 */
  readonly objectType: MemoryObjectType;
  /** 原始来源对象类型。 */
  readonly sourceObjectType: MemoryObjectType;
  /** 记忆所属作用域。 */
  readonly scope: MemoryScope;
  /** 原始来源对象 ID。 */
  readonly sourceObjectId: string;
  /** 关联的 Ticket。 */
  readonly ticketId?: TicketId;
  /** 关联的 Topic。 */
  readonly topicId?: TopicId;
  /** 关联的 Pipeline。 */
  readonly pipelineId?: PipelineId;
  /** 记忆摘要。 */
  readonly summary: string;
  /** 记忆内容。 */
  readonly content: string;
  /** 记忆的可见性。 */
  readonly visibility: MemoryVisibility;
  /** 记忆何时应被视为过期。 */
  readonly expiryCondition: string;
  /** 记忆版本号。 */
  readonly version: number;
  /** 当前是否已进入检索索引。 */
  readonly embeddingStatus: MemoryEmbeddingStatus;
  /** 记忆当前审查状态。 */
  readonly reviewState: MemoryReviewState;
  /** 与文档对齐的审查状态字段。 */
  readonly reviewStatus: MemoryReviewState;
  /** 该记忆附带的证据引用。 */
  readonly evidenceRefs: readonly EvidenceRef[];
  /** 记忆来源引用。 */
  readonly sourceRefs: readonly SourceRef[];
  /** 记忆创建时间。 */
  readonly createdAt: string;
  /** 记忆最后更新时间。 */
  readonly updatedAt: string;
  /** 记忆过期时间。 */
  readonly expiresAt?: string;
};

/**
 * 表示一次记忆检索请求。
 */
export type MemoryQuery = {
  /** 发起检索的 Agent。 */
  readonly requesterAgentId: AgentId;
  /** 希望检索的作用域。 */
  readonly scope: MemoryScope;
  /** 检索查询文本。 */
  readonly query: string;
  /** 使用的检索 profile。 */
  readonly profileId: string;
  /** 与请求相关的 Ticket。 */
  readonly ticketId?: TicketId;
  /** 与请求相关的 Topic。 */
  readonly topicId?: TopicId;
  /** 与请求相关的步骤。 */
  readonly stepId?: string;
};

/**
 * 表示单条召回记忆及其重排信息。
 */
export type RetrievedMemory = {
  /** 召回的记忆 ID。 */
  readonly memoryId: MemoryId;
  /** 召回记忆来源的对象类型。 */
  readonly sourceObjectType: MemoryObjectType;
  /** 召回记忆来源的对象 ID。 */
  readonly sourceObjectId: string;
  /** 召回记忆的内容。 */
  readonly content: string;
  /** 供下游消费的证据摘要。 */
  readonly evidenceSummary: string;
  /** 综合评分。 */
  readonly score: number;
  /** 来源引用。 */
  readonly sourceRefs: readonly SourceRef[];
  /** 是否已通过审查。 */
  readonly reviewed: boolean;
  /** 与该记忆冲突的记忆 ID。 */
  readonly conflictIds: readonly MemoryId[];
  /** 取代该记忆的新版本 ID。 */
  readonly supersededByIds: readonly MemoryId[];
};

/**
 * 描述一组需要治理处理的记忆冲突。
 */
export type MemoryConflict = {
  /** 发生冲突的主记忆 ID。 */
  readonly memoryId: MemoryId;
  /** 与主记忆冲突的对象列表。 */
  readonly conflictingWithIds: readonly MemoryId[];
  /** 当前配置下采用的冲突策略。 */
  readonly strategy: MemoryConflictStrategy;
  /** 冲突摘要。 */
  readonly summary: string;
};

/**
 * 表示可直接注入下游 Agent 上下文的记忆证据包。
 */
export type MemoryContextPackage = {
  /** 原始检索请求。 */
  readonly query: MemoryQuery;
  /** 实际采用的检索模式。 */
  readonly retrievalMode: RetrievalMode;
  /** 命中的 profile 配置。 */
  readonly profile: MemoryRetrievalProfile;
  /** 召回的记忆对象。 */
  readonly retrievedMemories: readonly RetrievedMemory[];
  /** 召回记忆 ID 列表。 */
  readonly retrievedMemoryIds: readonly MemoryId[];
  /** 汇总后的来源引用。 */
  readonly sourceRefs: readonly SourceRef[];
  /** 包整体的置信度。 */
  readonly confidence: number;
  /** 检测出的冲突标记。 */
  readonly conflictFlags: readonly MemoryConflict[];
};

/**
 * 表示 GraphRAG 中两条记忆之间的关系边。
 */
export type MemoryGraphEdge = {
  /** 边的起点。 */
  readonly fromMemoryId: MemoryId;
  /** 边的终点。 */
  readonly toMemoryId: MemoryId;
  /** 边类型。 */
  readonly edgeType: MemoryGraphEdgeType;
  /** 边权重。 */
  readonly weight: number;
};

/**
 * 描述一次索引构建或装载计划。
 */
export type MemoryIndexPlan = {
  /** 使用的检索模式。 */
  readonly retrievalMode: RetrievalMode;
  /** 需要参与索引的对象类型。 */
  readonly indexedObjectTypes: readonly IndexedObjectType[];
  /** 向量存储配置。 */
  readonly vectorStore?: string;
  /** 图存储配置。 */
  readonly graphStore?: string;
};