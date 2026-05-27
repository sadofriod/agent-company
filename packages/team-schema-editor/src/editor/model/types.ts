export type AgentMetadataDocument = {
  readonly name: string;
  readonly description: string;
  readonly profile?: string;
  readonly tool_policy?: string;
  readonly partials?: readonly string[];
  readonly tools?: readonly string[];
  readonly allowed_commands?: readonly string[];
  readonly required_commands?: readonly string[];
};

export type DepartmentDocument = {
  readonly department_id: string;
  readonly name: string;
  readonly mission: string;
  readonly decision_scope: readonly string[];
  readonly agents: readonly string[];
  readonly handoff_contracts: readonly string[];
};

export type AgentDocument = {
  readonly agent_id: string;
  readonly department_id: string;
  readonly role: string;
  readonly model: string;
  readonly metadata?: AgentMetadataDocument;
  readonly description?: string;
  readonly responsibilities: readonly string[];
  readonly input_contract: string;
  readonly output_contract: string;
  readonly skills: readonly string[];
  readonly mcp_servers: readonly string[];
  readonly tools: readonly string[];
  readonly memory_access_policy?: string;
};

export type DiscussionPolicyDocument = {
  readonly mode: string;
  readonly max_rounds: number;
  readonly supervisor_agent_id?: string;
  readonly conflict_resolution: string;
  readonly required_outputs: readonly string[];
};

export type PipelinePolicyDocument = {
  readonly one_pipeline_per_ticket: true;
  readonly dag_required: true;
  readonly step_owner_required: boolean;
  readonly review_before_handoff: boolean;
};

export type MemoryRetrievalProfileDocument = {
  readonly profile_id: string;
  readonly allowed_scopes: readonly string[];
  readonly max_results: number;
  readonly max_graph_hops: number;
  readonly require_reviewed_memory: boolean;
};

export type MemoryPolicyDocument = {
  readonly retrieval_mode: string;
  readonly vector_store?: string;
  readonly graph_store?: string;
  readonly indexed_object_types: readonly string[];
  readonly retrieval_profiles: readonly MemoryRetrievalProfileDocument[];
  readonly evidence_required_for_outputs: readonly string[];
  readonly conflict_strategy: string;
};

export type ReviewPolicyDocument = {
  readonly ticket_admission: readonly string[];
  readonly step_completion: readonly string[];
  readonly allowed_results: readonly string[];
};

export type TeamSchemaDocument = {
  readonly schema_version: string;
  readonly team_id: string;
  readonly team_name?: string;
  readonly departments: readonly DepartmentDocument[];
  readonly agents: readonly AgentDocument[];
  readonly discussion_policy: DiscussionPolicyDocument;
  readonly pipeline_policy: PipelinePolicyDocument;
  readonly memory_policy?: MemoryPolicyDocument;
  readonly review_policy: ReviewPolicyDocument;
};

export type GraphNodeKind = 'team' | 'department' | 'agent' | 'discussion' | 'pipeline' | 'review' | 'memory';

export type GraphNodeData = {
  readonly kind: GraphNodeKind;
  readonly title: string;
  readonly subtitle: string;
  readonly accent: string;
};

export type Selection =
  | { readonly kind: 'team' }
  | { readonly kind: 'department'; readonly departmentId: string }
  | { readonly kind: 'agent'; readonly agentId: string }
  | { readonly kind: 'discussion' }
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'review' }
  | { readonly kind: 'memory' };

export type ValidationIssue = {
  readonly code: string;
  readonly path: readonly string[];
  readonly message: string;
  readonly suggestion?: string;
};