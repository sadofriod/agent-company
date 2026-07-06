export enum RuntimeSessionStatus {
  Running = 'running',
  Paused = 'paused',
  Terminated = 'terminated',
}

export type RuntimeTaskDraft = {
  title: string;
  goal: string;
  constraints: string;
};

export type RuntimeSessionSnapshot = {
  sessionId: string;
  status: RuntimeSessionStatus;
  createdAt: string;
  updatedAt: string;
  runtimePlan: Record<string, unknown>;
  state: {
    context?: {
      runtimeId: string;
      task?: {
        title: string;
        goal: string;
        constraints: string[];
      };
      traceId?: string;
      teamId?: string;
      currentMode?: string;
      auditTrail?: unknown[];
      memoryScopes?: unknown[];
    };
    workModeDecision?: {
      mode?: string;
      reason?: string;
      requiredObjects?: string[];
    };
    pendingTickets?: unknown[];
    activeTicket?: RuntimeActiveTicket;
    completedTickets?: unknown[];
    activePipeline?: RuntimeActivePipeline;
    latestStepResult?: RuntimeStepResult;
    completedStepResults?: RuntimeStepResult[];
    latestReviewResult?: RuntimeReviewResult;
    reviewResults?: RuntimeReviewResult[];
    generatedHandoffs?: RuntimeHandoff[];
    discussionResult?: {
      topic?: { topicId: string; goal: string };
      decisions?: Array<{ decisionId: string; conclusion: string; rationale: string }>;
      ticketDrafts?: Array<{ ticketDraftId: string; title: string; ownerAgentId: string }>;
      turns?: RuntimeDiscussionTurn[];
      connectedTargets?: RuntimeDiscussionConnectedTarget[];
      blackboard?: RuntimeDiscussionBlackboard;
      conflicts?: Array<{ summary: string; kind: string }>;
      pendingItems?: Array<{ summary: string; blockingReason?: string }>;
      maxRoundsReached?: boolean;
    };
    interruption?: {
      kind: string;
      message: string;
      suggestedAction?: string;
      pipelineId?: string;
      stepId?: string;
      deniedCapabilityIds?: string[];
    };
    nextAction?: string;
  };
};

export const enum EditorMode {
  Edit = 'edit',
  Run = 'run',
}

export const enum RuntimeStatus {
  Idle = 'idle',
  Running = 'running',
  Paused = 'paused',
  Terminated = 'terminated',
}

export type RuntimeReviewIssue = {
  field: string;
  severity: 'pass' | 'revise' | 'block';
  message: string;
  suggestedOwnerAgentId?: string;
};

export type RuntimeReviewResult = {
  reviewId: string;
  status: 'pass' | 'revise' | 'block';
  reviewer: 'logic_review' | 'quality_review';
  issues: RuntimeReviewIssue[];
  targetId: string;
  targetType: string;
};

export type RuntimeCapabilityGrant = {
  capabilityId: string;
  capabilityType: 'skill' | 'mcp_server' | 'tool';
  grantedToAgentId: string;
  scope: string;
  reason: string;
  expiresWhen: string;
};

export type RuntimeCapabilityDenial = {
  capabilityId: string;
  reason?: string;
};

export type RuntimeDiscussionTurn = {
  round: number;
  agentId: string;
  departmentId: string;
  promptSummary: string;
  structuredOutput: {
    recommendation?: string;
    blackboardWrite?: string;
    ownerDepartmentId?: string;
    mode?: string;
    readTargetIds?: string[];
    writeTargetIds?: string[];
    [key: string]: unknown;
  };
};

export type RuntimeDiscussionConnectedTarget = {
  targetId: string;
  kind: 'agent' | 'department' | 'pipeline';
  label: string;
  detail: string;
  readableByAgentIds: string[];
  writableByAgentIds: string[];
  capabilityIds: string[];
  inputContract?: string;
  outputContract?: string;
  downstreamTargetIds?: string[];
};

export type RuntimeDiscussionBlackboardInput = {
  inputId: string;
  source: string;
  summary: string;
};

export type RuntimeDiscussionBlackboardEntry = {
  entryId: string;
  round: number;
  authorAgentId: string;
  sourceTargetIds: string[];
  summary: string;
};

export type RuntimeDiscussionBlackboard = {
  upstreamInputs: RuntimeDiscussionBlackboardInput[];
  connectedTargets: RuntimeDiscussionConnectedTarget[];
  entries: RuntimeDiscussionBlackboardEntry[];
  latestSummary: string;
};

export type RuntimeAgentExecutionSummary = {
  runner?: string;
  agentId?: string;
  role?: string;
  model?: string;
  gatewayProvider?: string;
  promptSummary?: string;
  responseSummary?: string;
  memoryIds?: string[];
  consumedHandoffIds?: string[];
  toolCalls?: unknown[];
};

export type RuntimeStepOutput = Record<string, unknown> & {
  summary?: string;
  goal?: string;
  inputContract?: string;
  outputContract?: string;
  agentExecution?: RuntimeAgentExecutionSummary;
};

export type RuntimeStepResult = {
  stepId: string;
  ticketId: string;
  ownerAgentId: string;
  output: RuntimeStepOutput;
  generatedAt: string;
};

export type RuntimeActiveTicket = {
  ticketId: string;
  ownerAgentId: string;
  title: string;
  goal: string;
  inputContract: string;
  outputContract: string;
};

export type RuntimeActivePipelineStep = {
  stepId: string;
  ticketId: string;
  ownerAgentId: string;
  title: string;
  dependsOn: string[];
  inputContract: string;
  outputContract: string;
  allowedCapabilities: string[];
  reviewRequired: boolean;
  failurePolicy: string;
};

export type RuntimeActivePipeline = {
  pipelineId: string;
  ticketId: string;
  steps: RuntimeActivePipelineStep[];
};

export type RuntimeHandoff = {
  handoffId: string;
  ticketId: string;
  fromStepId: string;
  fromAgentId: string;
  toStepId?: string;
  toAgentId?: string;
  inputContract: string;
  outputContract: string;
  payload: Record<string, unknown>;
};

export type RuntimeSessionTaskSummary = {
  title: string;
  goal: string;
};

export type RuntimeSessionListItem = {
  sessionId: string;
  status: RuntimeSessionStatus;
  createdAt: string;
  updatedAt: string;
  task?: RuntimeSessionTaskSummary;
};

export type RuntimeSessionListResponse = {
  items: RuntimeSessionListItem[];
  nextCursor?: string;
  total: number;
  limit: number;
};
