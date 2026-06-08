import type { Node } from '@xyflow/react';

export type AgentMetadataDocument = {
  name: string;
  description: string;
  profile?: string;
  tool_policy?: string;
  partials?: string[];
  tools?: string[];
  allowed_commands?: string[];
  required_commands?: string[];
};

export type DepartmentDocument = {
  department_id: string;
  name: string;
  mission: string;
  decision_scope: string[];
  agents: string[];
  handoff_contracts: string[];
};

export type AgentDocument = {
  agent_id: string;
  department_id: string;
  role: string;
  model: string;
  metadata?: AgentMetadataDocument;
  description?: string;
  responsibilities: string[];
  input_contract: string;
  output_contract: string;
  skills: string[];
  mcp_servers: string[];
  tools: string[];
  memory_access_policy?: string;
};

export type DiscussionPolicyDocument = {
  mode: string;
  max_rounds: number;
  supervisor_agent_id?: string;
  conflict_resolution: string;
  required_outputs: string[];
};

export type PipelinePolicyDocument = {
  one_pipeline_per_ticket: true;
  dag_required: true;
  step_owner_required: boolean;
  review_before_handoff: boolean;
};

export type MemoryRetrievalProfileDocument = {
  profile_id: string;
  allowed_scopes: string[];
  max_results: number;
  max_graph_hops: number;
  require_reviewed_memory: boolean;
};

export type MemoryPolicyDocument = {
  retrieval_mode: string;
  vector_store?: string;
  graph_store?: string;
  indexed_object_types: string[];
  retrieval_profiles: MemoryRetrievalProfileDocument[];
  evidence_required_for_outputs: string[];
  conflict_strategy: string;
};

export type ReviewPolicyDocument = {
  ticket_admission: string[];
  step_completion: string[];
  allowed_results: string[];
};

export type TeamSchemaDocument = {
  schema_version: string;
  team_id: string;
  team_name?: string;
  departments: DepartmentDocument[];
  agents: AgentDocument[];
  discussion_policy: DiscussionPolicyDocument;
  pipeline_policy: PipelinePolicyDocument;
  memory_policy?: MemoryPolicyDocument;
  review_policy: ReviewPolicyDocument;
};

export type TeamSchemaRecord = {
  key: string;
  schema: TeamSchemaDocument;
  updatedAt: string;
};

export type RuntimeSessionStatus = 'running' | 'paused' | 'terminated';

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
    completedStepResults?: unknown[];
    reviewResults?: unknown[];
    generatedHandoffs?: unknown[];
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

export const enum WorkflowEdgeMode {
  Discuss = 'discuss',
  Pipeline = 'pipeline',
}

export const enum WorkflowNodeType {
  Agent = 'agent',
  Part = 'part',
}

export const enum GraphNodeKind {
  Team = 'team',
  Department = 'department',
  Agent = 'agent',
  Part = 'part',
  Discussion = 'discussion',
  Pipeline = 'pipeline',
  Review = 'review',
  Memory = 'memory',
}

export type GraphNodeData = {
  kind: GraphNodeKind;
  nodeName: string;
  roleName?: string;
  departmentName?: string;
  detail?: string;
  accent: string;
  workflowNodeType?: WorkflowNodeType;
};

export type WorkflowGraphNode = Node<GraphNodeData, 'workflow'>;

export type Selection =
  | { kind: 'team' }
  | { kind: 'department'; departmentId: string }
  | { kind: 'agent'; agentId: string }
  | { kind: 'discussion' }
  | { kind: 'pipeline' }
  | { kind: 'review' }
  | { kind: 'memory' };

export type ValidationIssue = {
  code: string;
  path: readonly string[];
  message: string;
  suggestion?: string;
};