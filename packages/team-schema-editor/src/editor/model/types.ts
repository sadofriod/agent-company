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
  llm?: AgentLlmDocument;
};

export type AgentLlmDocument = {
  provider: string;
  model?: string;
  api_format?: string;
  base_url?: string;
  api_key_env?: string;
  headers?: Record<string, string>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
};

export type WorkflowNodeMetadata = {
  name: string;
  description: string;
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

export type TeamSchemaDocument = {
  schema_version: string;
  team_id: string;
  team_name?: string;
  departments: DepartmentDocument[];
  agents: AgentDocument[];
  discussion_policy: DiscussionPolicyDocument;
  memory_policy?: MemoryPolicyDocument;
  layout?: WorkflowLayoutDocument;
};

export type TeamSchemaRecord = {
  key: string;
  schema: TeamSchemaDocument;
  updatedAt: string;
};

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
    completedStepResults?: unknown[];
    reviewResults?: unknown[];
    generatedHandoffs?: unknown[];
    interruption?: unknown;
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
  DiscussBroadcast = 'discuss_broadcast',
  Pipeline = 'pipeline',
}

export const enum WorkflowEdgeType {
  SchemaRelation = 'schema-relation',
  DiscussAgents = 'discuss-agents',
  DiscussBroadcast = 'discuss-broadcast',
  PipelineHandoff = 'pipeline-handoff',
}

export const enum WorkflowNodeType {
  Agent = 'agent',
  Part = 'part',
  Pipeline = 'pipeline',
}

export type WorkflowEdgeData = {
  mode: WorkflowEdgeMode;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export enum SchemaEdgeTone {
  Structure = 'structure',
  Governance = 'governance',
  Memory = 'memory',
}

export enum MemoryScope {
  Discussion = 'discussion',
  Session = 'session',
}

export type SchemaEdgeData = {
  label?: string;
  tone: SchemaEdgeTone;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export const enum GraphNodeKind {
  Goal = 'goal',
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
  workflowAgentId?: string;
  workflowMetadata?: WorkflowNodeMetadata;
  memoryScope?: MemoryScope;
  department?: DepartmentDocument;
  agent?: AgentDocument;
  discussionPolicy?: DiscussionPolicyDocument;
  memoryPolicy?: MemoryPolicyDocument;
  runtimeHighlighted?: boolean;
  runtimeDimmed?: boolean;
};

export type WorkflowGraphNode = Node<GraphNodeData, 'workflow'>;

export type WorkflowLayoutJsonPrimitive = string | number | boolean | null;

export type WorkflowLayoutJsonValue =
  | WorkflowLayoutJsonPrimitive
  | WorkflowLayoutJsonValue[]
  | { [key: string]: WorkflowLayoutJsonValue };

export type WorkflowLayoutJsonObject = { [key: string]: WorkflowLayoutJsonValue };

export type WorkflowLayoutPositionDocument = {
  x: number;
  y: number;
};

export type WorkflowLayoutNodeDataDocument = {
  kind: GraphNodeKind;
  nodeName: string;
  roleName?: string;
  departmentName?: string;
  detail?: string;
  accent: string;
  workflowNodeType?: WorkflowNodeType;
  workflowAgentId?: string;
  workflowMetadata?: WorkflowNodeMetadata;
  memoryScope?: MemoryScope;
};

export type WorkflowLayoutNodeDocument = {
  id: string;
  type?: string;
  position: WorkflowLayoutPositionDocument;
  data?: WorkflowLayoutNodeDataDocument;
  style?: WorkflowLayoutJsonObject;
};

export type WorkflowLayoutEdgeDocument = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  data?: WorkflowLayoutJsonObject;
  markerStart?: WorkflowLayoutJsonValue;
  markerEnd?: WorkflowLayoutJsonValue;
  style?: WorkflowLayoutJsonObject;
};

export type WorkflowLayoutDocument = {
  nodes: WorkflowLayoutNodeDocument[];
  edges: WorkflowLayoutEdgeDocument[];
};

export type Selection =
  | { kind: 'team' }
  | { kind: 'department'; departmentId: string }
  | { kind: 'agent'; agentId: string }
  | { kind: 'workflowNode'; nodeId: string }
  | { kind: 'discussion' }
  | { kind: 'memory' };

export type ValidationIssue = {
  code: string;
  path: readonly string[];
  message: string;
  suggestion?: string;
};