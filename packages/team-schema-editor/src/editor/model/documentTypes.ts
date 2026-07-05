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
  layout?: import('./graphTypes').WorkflowLayoutDocument;
};

export type TeamSchemaRecord = {
  key: string;
  schema: TeamSchemaDocument;
  updatedAt: string;
};
