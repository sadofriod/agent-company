import { loadTeamSchema } from '@agents-team/service/schema/loadTeamSchema';

import { sampleTeamSchema } from '../../model/sampleTeamSchema';
import type { AgentDocument, DepartmentDocument, Selection, TeamSchemaDocument, ValidationIssue } from '../../model/types';

export type EditorState = {
  readonly schema: TeamSchemaDocument;
  readonly jsonValue: string;
  readonly parseError: string | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly selection: Selection;
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

export const validateEditorState = (schema: TeamSchemaDocument): Pick<EditorState, 'jsonValue' | 'parseError' | 'validationIssues'> => {
  const validation = validateSchemaDocument(schema);

  if (validation.ok) {
    return {
      jsonValue: JSON.stringify(schema, null, 2),
      parseError: null,
      validationIssues: [],
    };
  }

  return {
    jsonValue: JSON.stringify(schema, null, 2),
    parseError: formatIssues(validation.issues),
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

export const initialState: EditorState = {
  schema: sampleTeamSchema,
  selection: { kind: 'team' },
  ...validateEditorState(sampleTeamSchema),
};