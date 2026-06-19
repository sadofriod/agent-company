import { loadTeamSchema } from '@agents-team/service/schema/loadTeamSchema';

import type { AgentDocument, DepartmentDocument, MemoryPolicyDocument, MemoryRetrievalProfileDocument, Selection, TeamSchemaDocument, ValidationIssue } from '../../model/types';

export enum SchemaLoadStatus {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

export type EditorState = {
  schema: TeamSchemaDocument;
  validationIssues: readonly ValidationIssue[];
  selection: Selection;
  schemaLoadStatus: SchemaLoadStatus;
  schemaLoadError: string | null;
  schemaDocumentRevision: number;
};

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

type ValidationResult = { ok: true } | { ok: false; issues: readonly ValidationIssue[] };

export const parseList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const createDepartmentId = (schema: TeamSchemaDocument): string => `department_${schema.departments.length + 1}`;

export const createAgentId = (schema: TeamSchemaDocument, departmentId: string): string =>
  `${departmentId}_agent_${schema.agents.length + 1}`;

export const ensureUniqueId = (candidate: string, existingIds: string[]): string => {
  if (!existingIds.includes(candidate)) {
    return candidate;
  }

  let suffix = 2;
  while (existingIds.includes(`${candidate}_${suffix}`)) {
    suffix += 1;
  }

  return `${candidate}_${suffix}`;
};

export const validateSchemaDocument = (value: unknown): ValidationResult => {
  const validation = loadTeamSchema(value);

  if (validation.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    issues: validation.issues,
  };
};

export const formatIssues = (issues: readonly ValidationIssue[]): string =>
  issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      const suffix = issue.suggestion === undefined ? '' : ` Suggestion: ${issue.suggestion}`;
      return `${path}: ${issue.message}${suffix}`;
    })
    .join('\n');

export const validateEditorState = (schema: TeamSchemaDocument): Pick<EditorState, 'validationIssues'> => {
  const validation = validateSchemaDocument(schema);

  if (validation.ok) {
    return {
      validationIssues: [],
    };
  }

  return {
    validationIssues: validation.issues,
  };
};

export const updateDepartment = (
  schema: TeamSchemaDocument,
  departmentId: string,
  recipe: (department: DepartmentDocument) => DepartmentDocument,
): TeamSchemaDocument => ({
  ...schema,
  departments: schema.departments.map((department) =>
    department.department_id === departmentId ? recipe(department) : department,
  ),
});

export const updateAgent = (
  schema: TeamSchemaDocument,
  agentId: string,
  recipe: (agent: AgentDocument) => AgentDocument,
): TeamSchemaDocument => ({
  ...schema,
  agents: schema.agents.map((agent) => (agent.agent_id === agentId ? recipe(agent) : agent)),
});

export const createDefaultMemoryProfile = (profileId = 'default_memory'): MemoryRetrievalProfileDocument => ({
  profile_id: profileId,
  allowed_scopes: ['system', 'session', 'ticket'],
  max_results: 8,
  max_graph_hops: 1,
  require_reviewed_memory: false,
});

export const createDefaultMemoryPolicy = (): MemoryPolicyDocument => ({
  retrieval_mode: 'standard_rag',
  indexed_object_types: ['memory_object', 'topic', 'decision', 'ticket'],
  retrieval_profiles: [createDefaultMemoryProfile()],
  evidence_required_for_outputs: ['decision', 'ticket', 'handoff', 'review_result'],
  conflict_strategy: 'prefer_reviewed_latest',
});

export const withMemoryPolicy = (
  schema: TeamSchemaDocument,
  recipe: (memoryPolicy: MemoryPolicyDocument) => MemoryPolicyDocument,
): TeamSchemaDocument => ({
  ...schema,
  memory_policy: recipe(schema.memory_policy ?? createDefaultMemoryPolicy()),
});

export const withSchema = (state: EditorState, schema: TeamSchemaDocument): EditorState => ({
  ...state,
  schema,
  ...validateEditorState(schema),
});

export const createPendingTeamSchema = (): TeamSchemaDocument => ({
  schema_version: '0.1.0',
  team_id: 'loading-team-schema',
  team_name: 'Loading Team Schema',
  departments: [
    {
      department_id: 'loading',
      name: 'Loading',
      mission: 'Load the team schema from the service.',
      decision_scope: ['loading'],
      agents: ['loading_agent'],
      handoff_contracts: [],
    },
  ],
  agents: [
    {
      agent_id: 'loading_agent',
      department_id: 'loading',
      role: 'Schema Loader',
      model: 'default-model',
      description: 'Loads the editable team schema from the service.',
      responsibilities: ['load_schema'],
      input_contract: 'service_request',
      output_contract: 'team_schema',
      skills: [],
      mcp_servers: [],
      tools: [],
    },
  ],
  discussion_policy: {
    mode: 'supervisor_led',
    max_rounds: 1,
    supervisor_agent_id: 'loading_agent',
    conflict_resolution: 'supervisor_decision',
    required_outputs: ['team_schema'],
  },
  pipeline_policy: {
    one_pipeline_per_ticket: true,
    dag_required: true,
    step_owner_required: true,
    review_before_handoff: true,
  },
  review_policy: {
    ticket_admission: ['logic_review'],
    step_completion: ['quality_review'],
    allowed_results: ['pass', 'revise', 'block'],
  },
});

export const initialState: EditorState = {
  schema: createPendingTeamSchema(),
  selection: { kind: 'team' },
  validationIssues: [],
  schemaLoadStatus: SchemaLoadStatus.Idle,
  schemaLoadError: null,
  schemaDocumentRevision: 0,
};