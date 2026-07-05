import { loadTeamSchema } from '@agents-team/service/schema/loadTeamSchema';

import type { AgentDocument, DepartmentDocument, MemoryPolicyDocument, TeamSchemaDocument, ValidationIssue } from '../../model/types';
import { createDefaultMemoryPolicy } from './memoryPolicyDefaults';
import type { EditorState } from './editorTypes';

type ValidationResult = { ok: true } | { ok: false; issues: readonly ValidationIssue[] };

const findUniqueSuffix = (candidate: string, existingIds: readonly string[], suffix: number): string =>
  existingIds.includes(`${candidate}_${suffix}`)
    ? findUniqueSuffix(candidate, existingIds, suffix + 1)
    : `${candidate}_${suffix}`;

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

  return findUniqueSuffix(candidate, existingIds, 2);
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

export const withMemoryPolicy = (
  schema: TeamSchemaDocument,
  recipe: (memoryPolicy: MemoryPolicyDocument) => MemoryPolicyDocument,
): TeamSchemaDocument => ({
  ...schema,
  memory_policy: recipe(schema.memory_policy ?? createDefaultMemoryPolicy()),
});
