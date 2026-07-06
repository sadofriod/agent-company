export enum SchemaLoadStatus {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

export enum SchemaServiceStatus {
  Idle = 'idle',
  Loading = 'loading',
  Saving = 'saving',
  Deleting = 'deleting',
  Validating = 'validating',
  Error = 'error',
}

export enum SchemaField {
  TeamName = 'team_name',
  TeamId = 'team_id',
  SchemaVersion = 'schema_version',
}

export enum DepartmentField {
  Name = 'name',
  Mission = 'mission',
}

export enum DepartmentListField {
  DecisionScope = 'decision_scope',
  HandoffContracts = 'handoff_contracts',
}

export enum AgentField {
  Role = 'role',
  Model = 'model',
  Description = 'description',
  MemoryAccessPolicy = 'memory_access_policy',
}

export enum AgentListField {
  Responsibilities = 'responsibilities',
  Skills = 'skills',
  Tools = 'tools',
  McpServers = 'mcp_servers',
}

export enum AgentMetadataField {
  Name = 'name',
  Description = 'description',
  Profile = 'profile',
  ToolPolicy = 'tool_policy',
}

export enum AgentMetadataListField {
  Partials = 'partials',
  Tools = 'tools',
  AllowedCommands = 'allowed_commands',
  RequiredCommands = 'required_commands',
}

export enum DiscussionField {
  Mode = 'mode',
  ConflictResolution = 'conflict_resolution',
  SupervisorAgentId = 'supervisor_agent_id',
}

export enum MemoryPolicyField {
  RetrievalMode = 'retrieval_mode',
  VectorStore = 'vector_store',
  GraphStore = 'graph_store',
  ConflictStrategy = 'conflict_strategy',
}

export enum MemoryPolicyListField {
  IndexedObjectTypes = 'indexed_object_types',
  EvidenceRequiredForOutputs = 'evidence_required_for_outputs',
}

export enum MemoryRetrievalProfileField {
  ProfileId = 'profile_id',
}

export enum MemoryRetrievalProfileListField {
  AllowedScopes = 'allowed_scopes',
}

export enum MemoryRetrievalProfileNumberField {
  MaxResults = 'max_results',
  MaxGraphHops = 'max_graph_hops',
}

export enum MemoryRetrievalProfileBooleanField {
  RequireReviewedMemory = 'require_reviewed_memory',
}
