import type {
  AgentId,
  DecisionId,
  DepartmentId,
  EvidenceRef,
  SourceRef,
  TicketDraftId,
  TopicId,
} from './base';

/**
 * 表示一次需要被讨论和收敛的问题域。
 */
export type Topic = {
  /** Topic 唯一标识。 */
  readonly topicId: TopicId;
  /** 本次讨论要达成的目标。 */
  readonly goal: string;
  /** 讨论过程中必须满足的约束。 */
  readonly constraints: readonly string[];
  /** 需要参与讨论的部门集合。 */
  readonly participantDepartmentIds: readonly DepartmentId[];
  /** 讨论结束时预期得到的输出类型。 */
  readonly expectedOutputs: readonly string[];
};

/**
 * 表示 Topic 下需要单独收敛的子议题。
 */
export type Subtopic = {
  /** Subtopic 唯一标识。 */
  readonly subtopicId: string;
  /** 所属 Topic。 */
  readonly topicId: TopicId;
  /** 子议题标题。 */
  readonly title: string;
  /** 子议题目标。 */
  readonly goal: string;
  /** 子议题约束。 */
  readonly constraints: readonly string[];
  /** 参与该子议题讨论的部门。 */
  readonly participantDepartmentIds: readonly DepartmentId[];
  /** 子议题预期产出。 */
  readonly expectedOutputs: readonly string[];
};

/**
 * 表示经讨论冻结后的结构化决策。
 */
export type Decision = {
  /** 决策唯一标识。 */
  readonly decisionId: DecisionId;
  /** 决策所属 Topic。 */
  readonly topicId: TopicId;
  /** 负责该决策的 Owner 部门。 */
  readonly ownerDepartmentId: DepartmentId;
  /** 决策结论。 */
  readonly conclusion: string;
  /** 支撑结论的理由。 */
  readonly rationale: string;
  /** 决策引用的来源列表。 */
  readonly sourceRefs: readonly SourceRef[];
  /** 支撑决策的召回记忆 ID。 */
  readonly retrievedMemoryIds: readonly string[];
};

/**
 * 表示尚未进入准入审查的待执行票据草稿。
 */
export type TicketDraft = {
  /** 草稿唯一标识。 */
  readonly ticketDraftId: TicketDraftId;
  /** 草稿所属 Topic。 */
  readonly topicId: TopicId;
  /** 草稿的建议 Owner Agent。 */
  readonly ownerAgentId: AgentId;
  /** 草稿标题。 */
  readonly title: string;
  /** 草稿目标。 */
  readonly goal: string;
  /** 输入契约。 */
  readonly inputContract: string;
  /** 输出契约。 */
  readonly outputContract: string;
  /** 验收标准列表。 */
  readonly acceptanceCriteria: readonly string[];
  /** 失败处理策略。 */
  readonly failurePolicy: string;
  /** 派生该草稿的决策集合。 */
  readonly derivedFromDecisionIds: readonly DecisionId[];
  /** 执行该草稿所需的能力标识。 */
  readonly requiredCapabilities: readonly string[];
};

/**
 * 记录一次讨论轮次中某个 Agent 的结构化产出。
 */
export type DiscussionTurn = {
  /** 当前是第几轮讨论。 */
  readonly round: number;
  /** 发言 Agent。 */
  readonly agentId: AgentId;
  /** 发言 Agent 所属部门。 */
  readonly departmentId: DepartmentId;
  /** 本轮输入摘要。 */
  readonly promptSummary: string;
  /** 本轮输出的结构化对象。 */
  readonly structuredOutput: Readonly<Record<string, unknown>>;
  /** 本轮引用的证据。 */
  readonly evidenceRefs: readonly EvidenceRef[];
};

export enum DiscussionConflictKind {
  OwnerConflict = 'owner_conflict',
  BoundaryConflict = 'boundary_conflict',
  DependencyConflict = 'dependency_conflict',
  MemoryConflict = 'memory_conflict',
  UnresolvedDecision = 'unresolved_decision',
}

/**
 * 描述讨论阶段识别出的结构性冲突。
 */
export type DiscussionConflict = {
  /** 冲突类别。 */
  readonly kind: DiscussionConflictKind;
  /** 冲突摘要。 */
  readonly summary: string;
  /** 涉及的 Owner 部门集合。 */
  readonly ownerDepartmentIds: readonly DepartmentId[];
  /** 与冲突相关的决策集合。 */
  readonly relatedDecisionIds: readonly DecisionId[];
};

/**
 * 表示尚未解决、需要继续处理的待办项。
 */
export type PendingItem = {
  /** 待办摘要。 */
  readonly summary: string;
  /** 建议负责处理的部门。 */
  readonly requiredOwnerDepartmentId?: DepartmentId;
  /** 当前阻塞原因。 */
  readonly blockingReason: string;
};

/**
 * 汇总一次讨论流程的完整结果。
 */
export type DiscussionResult = {
  /** 收敛出的 Topic。 */
  readonly topic: Topic;
  /** Topic 下拆分出的子议题。 */
  readonly subtopics: readonly Subtopic[];
  /** 形成的决策集合。 */
  readonly decisions: readonly Decision[];
  /** 形成的 Ticket 草稿集合。 */
  readonly ticketDrafts: readonly TicketDraft[];
  /** 讨论轮次明细。 */
  readonly turns: readonly DiscussionTurn[];
  /** 已识别的冲突。 */
  readonly conflicts: readonly DiscussionConflict[];
  /** 尚未解决的待办项。 */
  readonly pendingItems: readonly PendingItem[];
  /** 推荐的裁决 Agent。 */
  readonly recommendedArbiterAgentId?: AgentId;
  /** 是否因为达到最大轮次而停止。 */
  readonly maxRoundsReached: boolean;
};