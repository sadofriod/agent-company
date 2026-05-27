import type {
  AgentId,
  DecisionId,
  EvidenceRef,
  HandoffId,
  PipelineId,
  PipelineStepId,
  TicketId,
} from './base';

/**
 * 表示通过准入审查后可执行的单个工作单元。
 */
export type Ticket = {
  /** Ticket 唯一标识。 */
  readonly ticketId: TicketId;
  /** Ticket 的唯一 Owner Agent。 */
  readonly ownerAgentId: AgentId;
  /** Ticket 标题。 */
  readonly title: string;
  /** Ticket 目标。 */
  readonly goal: string;
  /** Ticket 输入契约。 */
  readonly inputContract: string;
  /** Ticket 输出契约。 */
  readonly outputContract: string;
  /** Ticket 验收标准。 */
  readonly acceptanceCriteria: readonly string[];
  /** Ticket 失败处理策略。 */
  readonly failurePolicy: string;
  /** Ticket 来源决策集合。 */
  readonly derivedFromDecisionIds: readonly DecisionId[];
};

/**
 * 表示 Pipeline DAG 中的一个执行步骤。
 */
export type PipelineStep = {
  /** Step 唯一标识。 */
  readonly stepId: PipelineStepId;
  /** Step 所属 Ticket。 */
  readonly ticketId: TicketId;
  /** Step Owner Agent。 */
  readonly ownerAgentId: AgentId;
  /** Step 标题。 */
  readonly title: string;
  /** 该 Step 依赖的前置步骤。 */
  readonly dependsOn: readonly PipelineStepId[];
  /** Step 输入契约。 */
  readonly inputContract: string;
  /** Step 输出契约。 */
  readonly outputContract: string;
  /** Step 可申请的能力集合。 */
  readonly allowedCapabilities: readonly string[];
  /** Step 完成后是否必须经过审查。 */
  readonly reviewRequired: boolean;
  /** Step 可选超时时间。 */
  readonly timeoutMs?: number;
  /** Step 失败处理策略。 */
  readonly failurePolicy: string;
};

/**
 * 表示服务单个 Ticket 的执行流程。
 */
export type Pipeline = {
  /** Pipeline 唯一标识。 */
  readonly pipelineId: PipelineId;
  /** Pipeline 绑定的 Ticket。 */
  readonly ticketId: TicketId;
  /** Pipeline 中包含的步骤集合。 */
  readonly steps: readonly PipelineStep[];
};

/**
 * 表示单个 Step 完成后的结构化输出。
 */
export type StepResult = {
  /** 结果对应的 Step。 */
  readonly stepId: PipelineStepId;
  /** 结果所属 Ticket。 */
  readonly ticketId: TicketId;
  /** 产生结果的 Agent。 */
  readonly ownerAgentId: AgentId;
  /** 结构化输出对象。 */
  readonly output: Readonly<Record<string, unknown>>;
  /** 输出所依赖的证据。 */
  readonly evidenceRefs: readonly EvidenceRef[];
  /** 结果生成时间。 */
  readonly generatedAt: string;
};

/**
 * 表示步骤间或 Agent 间的结构化交接对象。
 */
export type Handoff = {
  /** Handoff 唯一标识。 */
  readonly handoffId: HandoffId;
  /** Handoff 所属 Ticket。 */
  readonly ticketId: TicketId;
  /** 交出结果的步骤。 */
  readonly fromStepId: PipelineStepId;
  /** 消费该交接的下游步骤。 */
  readonly toStepId?: PipelineStepId;
  /** 交出结果的 Agent。 */
  readonly fromAgentId: AgentId;
  /** 接收交接的 Agent。 */
  readonly toAgentId?: AgentId;
  /** 交接载荷。 */
  readonly payload: Readonly<Record<string, unknown>>;
  /** 交接输入契约。 */
  readonly inputContract: string;
  /** 交接输出契约。 */
  readonly outputContract: string;
  /** 交接所附带的证据。 */
  readonly evidenceRefs: readonly EvidenceRef[];
};

/**
 * 描述 Pipeline 执行过程中出现的中断及建议动作。
 */
export type PipelineInterruption = {
  /** 中断类型。 */
  readonly kind:
    | 'revise_upstream'
    | 'reload_capability'
    | 'return_to_discussion'
    | 'ticket_admission_failed'
    | 'pipeline_cycle_detected';
  /** 涉及的 Pipeline。 */
  readonly pipelineId?: PipelineId;
  /** 涉及的步骤。 */
  readonly stepId?: PipelineStepId;
  /** 中断信息说明。 */
  readonly message: string;
  /** 建议的恢复动作。 */
  readonly suggestedAction: string;
};