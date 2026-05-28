import { loadTeamSchema } from '@agents-team/service/schema/loadTeamSchema';

import type { AgentDocument, DepartmentDocument, Selection, TeamSchemaDocument, ValidationIssue } from '../../model/types';

export type SchemaLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type EditorState = {
  readonly schema: TeamSchemaDocument;
  readonly validationIssues: readonly ValidationIssue[];
  readonly selection: Selection;
  readonly schemaLoadStatus: SchemaLoadStatus;
  readonly schemaLoadError: string | null;
};

export type SchemaField = 'team_name' | 'team_id' | 'schema_version';
export type DepartmentField = 'name' | 'mission';
export type DepartmentListField = 'decision_scope' | 'handoff_contracts';
export type AgentField = 'role' | 'model' | 'description';
export type AgentListField = 'responsibilities' | 'skills' | 'tools' | 'mcp_servers';
export type DiscussionField = 'mode' | 'conflict_resolution' | 'supervisor_agent_id';

type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

export const parseList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const createDepartmentId = (schema: TeamSchemaDocument): string => `department_${schema.departments.length + 1}`;

export const createAgentId = (schema: TeamSchemaDocument, departmentId: string): string =>
  `${departmentId}_agent_${schema.agents.length + 1}`;

export const ensureUniqueId = (candidate: string, existingIds: readonly string[]): string => {
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
  schemaLoadStatus: 'idle',
  schemaLoadError: null,
};