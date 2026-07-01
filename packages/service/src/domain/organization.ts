import type {
  AgentId,
  DepartmentId,
  MemoryProfileId,
  TeamId,
} from './base';

/** 定义讨论阶段支持的协作拓扑。 */
export const DISCUSSION_MODE = {
  SupervisorLed: 'supervisor_led',
  SequentialHandoff: 'sequential_handoff',
  ParallelReview: 'parallel_review',
} as const;

/** 讨论协作模式类型。 */
export type DiscussionMode =
  typeof DISCUSSION_MODE[keyof typeof DISCUSSION_MODE];

/** 定义讨论冲突的裁决方式。 */
export const CONFLICT_RESOLUTION = {
  SupervisorDecision: 'supervisor_decision',
  OwnerDecision: 'owner_decision',
  BlockAndEscalate: 'block_and_escalate',
} as const;

/** 冲突裁决策略类型。 */
export type ConflictResolution =
  typeof CONFLICT_RESOLUTION[keyof typeof CONFLICT_RESOLUTION];

/** 定义记忆检索模式。 */
export const RETRIEVAL_MODE = {
  StandardRag: 'standard_rag',
  HybridVectorGraph: 'hybrid_vector_graph',
} as const;

/** 记忆检索模式类型。 */
export type RetrievalMode = typeof RETRIEVAL_MODE[keyof typeof RETRIEVAL_MODE];

/** 定义可治理的记忆作用域。 */
export const MEMORY_SCOPE = {
  System: 'system',
  Session: 'session',
  Topic: 'topic',
  Ticket: 'ticket',
} as const;

/** 记忆作用域类型。 */
export type MemoryScope = typeof MEMORY_SCOPE[keyof typeof MEMORY_SCOPE];

/** 定义允许进入记忆索引的结构化对象类别。 */
export const INDEXED_OBJECT_TYPE = {
  MemoryObject: 'memory_object',
  Topic: 'topic',
  Decision: 'decision',
  Ticket: 'ticket',
  Pipeline: 'pipeline',
  Handoff: 'handoff',
  ReviewResult: 'review_result',
  AuditEvent: 'audit_event',
} as const;

/** 可被索引的对象类型。 */
export type IndexedObjectType =
  typeof INDEXED_OBJECT_TYPE[keyof typeof INDEXED_OBJECT_TYPE];

/** 定义记忆冲突的处理策略。 */
export const MEMORY_CONFLICT_STRATEGY = {
  ReturnConflictsToReview: 'return_conflicts_to_review',
  PreferReviewedLatest: 'prefer_reviewed_latest',
  BlockOnConflict: 'block_on_conflict',
} as const;

/** 记忆冲突处理策略类型。 */
export type MemoryConflictStrategy =
  typeof MEMORY_CONFLICT_STRATEGY[keyof typeof MEMORY_CONFLICT_STRATEGY];

export const LLM_API_FORMAT = {
  OpenAIChat: 'openai_chat',
  OpenAIResponses: 'openai_responses',
  AnthropicMessages: 'anthropic_messages',
  GoogleGenerateContent: 'google_generate_content',
  Custom: 'custom',
} as const;

export type AgentLlmApiFormat = typeof LLM_API_FORMAT[keyof typeof LLM_API_FORMAT];

export type AgentLlmBinding = {
  /** LLM provider 或 gateway provider 标识。 */
  readonly provider: string;
  /** provider 级别的模型覆写；未提供时回退到 AgentDefinition.model。 */
  readonly model?: string;
  /** provider 对应的请求协议格式。 */
  readonly apiFormat?: AgentLlmApiFormat;
  /** 可选自定义 base URL，用于兼容 gateway 或代理。 */
  readonly baseUrl?: string;
  /** API key 所在环境变量名。 */
  readonly apiKeyEnv?: string;
  /** 透传给 provider 的静态请求头。 */
  readonly headers: Readonly<Record<string, string>>;
  /** 生成温度。 */
  readonly temperature?: number;
  /** 最大输出 token 数。 */
  readonly maxTokens?: number;
  /** nucleus sampling top_p。 */
  readonly topP?: number;
};

/**
 * 描述 Agent 提示词文件中可结构化读取的元数据。
 */
export type AgentMetadata = {
  /** Agent 在运行时或 UI 中展示的名称。 */
  readonly name: string;
  /** Agent 的简要摘要描述。 */
  readonly description: string;
  /** Agent 绑定的 profile。 */
  readonly profile?: string;
  /** Agent 的工具治理策略。 */
  readonly toolPolicy?: string;
  /** Agent 依赖的 partial 模块。 */
  readonly partials: readonly string[];
  /** Agent 默认可见的工具集合。 */
  readonly tools: readonly string[];
  /** Agent 允许输出的命令集合。 */
  readonly allowedCommands: readonly string[];
  /** Agent 必须输出的命令集合。 */
  readonly requiredCommands: readonly string[];
  /** Agent 对应的 LLM / gateway 绑定信息。 */
  readonly llm?: AgentLlmBinding;
};

/**
 * 描述团队中的部门边界和协作约束。
 */
export type Department = {
  /** 部门唯一标识。 */
  readonly departmentId: DepartmentId;
  /** 部门名称。 */
  readonly name: string;
  /** 部门使命说明。 */
  readonly mission: string;
  /** 部门被授权处理的决策范围。 */
  readonly decisionScope: readonly string[];
  /** 隶属于该部门的 Agent 集合。 */
  readonly agentIds: readonly AgentId[];
  /** 部门对外的标准交接契约。 */
  readonly handoffContracts: readonly string[];
};

/**
 * 描述 Team Schema 中声明的单个 Agent。
 */
export type AgentDefinition = {
  /** Agent 唯一标识。 */
  readonly agentId: AgentId;
  /** Agent 所属部门。 */
  readonly departmentId: DepartmentId;
  /** Agent 承担的角色名称。 */
  readonly role: string;
  /** 运行该 Agent 的模型标识。 */
  readonly model: string;
  /** Agent 的职责列表。 */
  readonly responsibilities: readonly string[];
  /** Agent 消费输入的结构契约。 */
  readonly inputContract: string;
  /** Agent 产出输出的结构契约。 */
  readonly outputContract: string;
  /** Agent 可使用的 Skill 标识集合。 */
  readonly skillIds: readonly string[];
  /** Agent 可接入的 MCP Server 标识集合。 */
  readonly mcpServerIds: readonly string[];
  /** Agent 可申请的 Tool 标识集合。 */
  readonly toolIds: readonly string[];
  /** Agent 绑定的记忆检索 profile。 */
  readonly memoryAccessProfileId?: MemoryProfileId;
  /** Agent 附带的结构化元数据。 */
  readonly metadata?: AgentMetadata;
  /** Agent 的详细描述或完整提示词正文。 */
  readonly description?: string;
};

/**
 * 描述讨论阶段的执行策略。
 */
export type DiscussionPolicy = {
  /** 讨论采用的拓扑模式。 */
  readonly mode: DiscussionMode;
  /** 允许的最大轮次数。 */
  readonly maxRounds: number;
  /** supervisor-led 模式下的监督 Agent。 */
  readonly supervisorAgentId?: AgentId;
  /** 冲突发生时的处理策略。 */
  readonly conflictResolution: ConflictResolution;
  /** 讨论结束前必须产出的对象列表。 */
  readonly requiredOutputs: readonly string[];
};

/**
 * 描述单个记忆检索配置档。
 */
export type MemoryRetrievalProfile = {
  /** profile 唯一标识。 */
  readonly profileId: MemoryProfileId;
  /** 该 profile 允许访问的记忆作用域。 */
  readonly allowedScopes: readonly MemoryScope[];
  /** 单次检索最多返回的结果数量。 */
  readonly maxResults: number;
  /** GraphRAG 模式允许的最大跳数。 */
  readonly maxGraphHops: number;
  /** 是否仅允许已审查记忆进入结果。 */
  readonly requireReviewedMemory: boolean;
};

export enum EvidenceRequiredOutputType {
  Decision = 'decision',
  Ticket = 'ticket',
  Handoff = 'handoff',
  ReviewResult = 'review_result',
}

/**
 * 描述团队级记忆治理与索引策略。
 */
export type MemoryPolicy = {
  /** 当前启用的记忆检索模式。 */
  readonly retrievalMode: RetrievalMode;
  /** 向量存储标识。 */
  readonly vectorStore?: string;
  /** 图存储标识。 */
  readonly graphStore?: string;
  /** 需要被索引的结构化对象类别。 */
  readonly indexedObjectTypes: readonly IndexedObjectType[];
  /** 团队声明的检索配置档。 */
  readonly retrievalProfiles: readonly MemoryRetrievalProfile[];
  /** 必须附带证据引用的输出对象类型。 */
  readonly evidenceRequiredForOutputs: readonly EvidenceRequiredOutputType[];
  /** 召回到冲突记忆时的治理策略。 */
  readonly conflictStrategy: MemoryConflictStrategy;
};

/**
 * 表示完成校验和解析后的团队定义。
 */
export type TeamDefinition = {
  /** Team Schema 版本。 */
  readonly schemaVersion: string;
  /** 团队唯一标识。 */
  readonly teamId: TeamId;
  /** 团队展示名称。 */
  readonly teamName?: string;
  /** 团队下的部门集合。 */
  readonly departments: readonly Department[];
  /** 团队下的 Agent 集合。 */
  readonly agents: readonly AgentDefinition[];
  /** 讨论策略。 */
  readonly discussionPolicy: DiscussionPolicy;
  /** 可选的记忆治理策略。 */
  readonly memoryPolicy?: MemoryPolicy;
};