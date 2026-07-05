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
    completedTickets?: unknown[];
    completedStepResults?: RuntimeStepResult[];
    reviewResults?: RuntimeReviewResult[];
    generatedHandoffs?: RuntimeHandoff[];
    discussionResult?: {
      topic?: { topicId: string; goal: string };
      decisions?: Array<{ decisionId: string; conclusion: string; rationale: string }>;
      ticketDrafts?: Array<{ ticketDraftId: string; title: string; ownerAgentId: string }>;
      turns?: RuntimeDiscussionTurn[];
      conflicts?: Array<{ summary: string; kind: string }>;
      pendingItems?: Array<{ summary: string; blockingReason?: string }>;
      maxRoundsReached?: boolean;
    };
    interruption?: {
      kind: string;
      message: string;
      suggestedAction?: string;
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
    ownerDepartmentId?: string;
    mode?: string;
    [key: string]: unknown;
  };
};

export type RuntimeStepResult = {
  stepId: string;
  ticketId: string;
  ownerAgentId: string;
  output: Record<string, unknown>;
  generatedAt: string;
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
