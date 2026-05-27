import { createSlice } from '@reduxjs/toolkit';
import { loadTeamSchema } from '@agents-team/service/schema/loadTeamSchema';

import { sampleTeamSchema } from '../model/sampleTeamSchema';
import type { AgentDocument, DepartmentDocument, Selection, TeamSchemaDocument, ValidationIssue } from '../model/types';

type EditorState = {
  readonly schema: TeamSchemaDocument;
  readonly jsonValue: string;
  readonly parseError: string | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly selection: Selection;
};

type SchemaField = 'team_name' | 'team_id' | 'schema_version';
type DepartmentField = 'name' | 'mission';
type DepartmentListField = 'decision_scope' | 'handoff_contracts';
type AgentField = 'role' | 'model' | 'description';
type AgentListField = 'responsibilities' | 'skills' | 'tools' | 'mcp_servers';
type DiscussionField = 'mode' | 'conflict_resolution' | 'supervisor_agent_id';

type ValidationResult = { readonly ok: true } | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const parseList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const createDepartmentId = (schema: TeamSchemaDocument): string => `department_${schema.departments.length + 1}`;

const createAgentId = (schema: TeamSchemaDocument, departmentId: string): string => `${departmentId}_agent_${schema.agents.length + 1}`;

const ensureUniqueId = (candidate: string, existingIds: readonly string[]): string => {
  if (!existingIds.includes(candidate)) {
    return candidate;
  }

  let suffix = 2;
  while (existingIds.includes(`${candidate}_${suffix}`)) {
    suffix += 1;
  }

  return `${candidate}_${suffix}`;
};

const validateSchemaDocument = (value: unknown): ValidationResult => {
  const validation = loadTeamSchema(value);

  if (validation.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    issues: validation.issues,
  };
};

const formatIssues = (issues: readonly ValidationIssue[]): string =>
  issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      const suffix = issue.suggestion === undefined ? '' : ` Suggestion: ${issue.suggestion}`;
      return `${path}: ${issue.message}${suffix}`;
    })
    .join('\n');

const validateEditorState = (schema: TeamSchemaDocument): Pick<EditorState, 'jsonValue' | 'parseError' | 'validationIssues'> => {
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

const updateDepartment = (
  schema: TeamSchemaDocument,
  departmentId: string,
  recipe: (department: DepartmentDocument) => DepartmentDocument,
): TeamSchemaDocument => ({
  ...schema,
  departments: schema.departments.map((department) =>
    department.department_id === departmentId ? recipe(department) : department,
  ),
});

const updateAgent = (
  schema: TeamSchemaDocument,
  agentId: string,
  recipe: (agent: AgentDocument) => AgentDocument,
): TeamSchemaDocument => ({
  ...schema,
  agents: schema.agents.map((agent) => (agent.agent_id === agentId ? recipe(agent) : agent)),
});

const withSchema = (state: EditorState, schema: TeamSchemaDocument): EditorState => ({
  ...state,
  schema,
  ...validateEditorState(schema),
});

const initialState: EditorState = {
  schema: sampleTeamSchema,
  selection: { kind: 'team' },
  ...validateEditorState(sampleTeamSchema),
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    selectNode(state, action: { payload: string | null; type: string }): void {
      const nodeId = action.payload;

      if (nodeId === null) {
        return;
      }

      if (nodeId === 'team') {
        state.selection = { kind: 'team' };
        return;
      }

      if (nodeId.startsWith('department:')) {
        state.selection = { kind: 'department', departmentId: nodeId.replace('department:', '') };
        return;
      }

      if (nodeId.startsWith('agent:')) {
        state.selection = { kind: 'agent', agentId: nodeId.replace('agent:', '') };
        return;
      }

      if (nodeId === 'discussion') {
        state.selection = { kind: 'discussion' };
        return;
      }

      if (nodeId === 'pipeline') {
        state.selection = { kind: 'pipeline' };
        return;
      }

      if (nodeId === 'review') {
        state.selection = { kind: 'review' };
        return;
      }

      if (nodeId === 'memory') {
        state.selection = { kind: 'memory' };
      }
    },
    setJsonValue(state, action: { payload: string; type: string }): void {
      state.jsonValue = action.payload;
    },
    applyJson(state): EditorState {
      try {
        const nextSchema = JSON.parse(state.jsonValue) as unknown;
        const validation = validateSchemaDocument(nextSchema);

        if (!validation.ok) {
          return {
            ...state,
            parseError: formatIssues(validation.issues),
            validationIssues: [...validation.issues],
          };
        }

        const typedSchema = nextSchema as TeamSchemaDocument;
        return withSchema(state, typedSchema);
      } catch (error) {
        return {
          ...state,
          parseError: error instanceof Error ? error.message : 'Invalid JSON',
        };
      }
    },
    resetSample(state): EditorState {
      return {
        ...withSchema(state, sampleTeamSchema),
        selection: { kind: 'team' },
      };
    },
    updateTeamField(state, action: { payload: { readonly field: SchemaField; readonly value: string }; type: string }): void {
      const schema = {
        ...state.schema,
        [action.payload.field]: action.payload.value,
      };

      Object.assign(state, withSchema(state, schema));
    },
    updateDepartmentField(state, action: { payload: { readonly departmentId: string; readonly field: DepartmentField; readonly value: string }; type: string }): void {
      const schema = updateDepartment(state.schema, action.payload.departmentId, (department) => ({
        ...department,
        [action.payload.field]: action.payload.value,
      }));

      Object.assign(state, withSchema(state, schema));
    },
    updateDepartmentList(state, action: { payload: { readonly departmentId: string; readonly field: DepartmentListField; readonly value: string }; type: string }): void {
      const schema = updateDepartment(state.schema, action.payload.departmentId, (department) => ({
        ...department,
        [action.payload.field]: parseList(action.payload.value),
      }));

      Object.assign(state, withSchema(state, schema));
    },
    updateAgentField(state, action: { payload: { readonly agentId: string; readonly field: AgentField; readonly value: string }; type: string }): void {
      const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
        ...agent,
        [action.payload.field]: action.payload.value,
      }));

      Object.assign(state, withSchema(state, schema));
    },
    updateAgentList(state, action: { payload: { readonly agentId: string; readonly field: AgentListField; readonly value: string }; type: string }): void {
      const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
        ...agent,
        [action.payload.field]: parseList(action.payload.value),
      }));

      Object.assign(state, withSchema(state, schema));
    },
    updateDiscussionField(state, action: { payload: { readonly field: DiscussionField; readonly value: string }; type: string }): void {
      const schema = {
        ...state.schema,
        discussion_policy: {
          ...state.schema.discussion_policy,
          [action.payload.field]: action.payload.value,
        },
      };

      Object.assign(state, withSchema(state, schema));
    },
    updateDiscussionNumber(state, action: { payload: { readonly field: 'max_rounds'; readonly value: number }; type: string }): void {
      const schema = {
        ...state.schema,
        discussion_policy: {
          ...state.schema.discussion_policy,
          [action.payload.field]: Number.isFinite(action.payload.value)
            ? Math.max(1, Math.floor(action.payload.value))
            : state.schema.discussion_policy[action.payload.field],
        },
      };

      Object.assign(state, withSchema(state, schema));
    },
    addDepartment(state): void {
      const departmentId = ensureUniqueId(
        createDepartmentId(state.schema),
        state.schema.departments.map((department) => department.department_id),
      );

      const schema = {
        ...state.schema,
        departments: [
          ...state.schema.departments,
          {
            department_id: departmentId,
            name: 'New Department',
            mission: 'Describe the department mission.',
            decision_scope: [],
            agents: [],
            handoff_contracts: [],
          },
        ],
      };

      Object.assign(state, withSchema(state, schema));
      state.selection = { kind: 'team' };
    },
    removeDepartment(state, action: { payload: string; type: string }): void {
      const departmentId = action.payload;
      const removedAgentIds = state.schema.agents
        .filter((agent) => agent.department_id === departmentId)
        .map((agent) => agent.agent_id);

      const nextDiscussionPolicy = removedAgentIds.includes(state.schema.discussion_policy.supervisor_agent_id ?? '')
        ? {
            ...state.schema.discussion_policy,
            supervisor_agent_id: undefined,
          }
        : state.schema.discussion_policy;

      const schema = {
        ...state.schema,
        departments: state.schema.departments.filter((department) => department.department_id !== departmentId),
        agents: state.schema.agents.filter((agent) => agent.department_id !== departmentId),
        discussion_policy: nextDiscussionPolicy,
      };

      Object.assign(state, withSchema(state, schema));
      state.selection = { kind: 'team' };
    },
    addAgent(state, action: { payload: string; type: string }): void {
      const departmentId = action.payload;
      const agentId = ensureUniqueId(
        createAgentId(state.schema, departmentId),
        state.schema.agents.map((agent) => agent.agent_id),
      );

      const schema = {
        ...state.schema,
        departments: state.schema.departments.map((department) =>
          department.department_id === departmentId
            ? {
                ...department,
                agents: [...department.agents, agentId],
              }
            : department,
        ),
        agents: [
          ...state.schema.agents,
          {
            agent_id: agentId,
            department_id: departmentId,
            role: 'New Role',
            model: 'default-model',
            responsibilities: [],
            input_contract: 'input_contract',
            output_contract: 'output_contract',
            skills: [],
            mcp_servers: [],
            tools: [],
            memory_access_policy: undefined,
            description: 'Describe the agent responsibilities.',
          },
        ],
      };

      Object.assign(state, withSchema(state, schema));
      state.selection = { kind: 'department', departmentId };
    },
    removeAgent(state, action: { payload: string; type: string }): void {
      const agentId = action.payload;

      const schema = {
        ...state.schema,
        departments: state.schema.departments.map((department) => ({
          ...department,
          agents: department.agents.filter((currentAgentId) => currentAgentId !== agentId),
        })),
        agents: state.schema.agents.filter((agent) => agent.agent_id !== agentId),
        discussion_policy:
          state.schema.discussion_policy.supervisor_agent_id === agentId
            ? {
                ...state.schema.discussion_policy,
                supervisor_agent_id: undefined,
              }
            : state.schema.discussion_policy,
      };

      Object.assign(state, withSchema(state, schema));
      state.selection = { kind: 'team' };
    },
  },
});

export const {
  addAgent,
  addDepartment,
  applyJson,
  removeAgent,
  removeDepartment,
  resetSample,
  selectNode,
  setJsonValue,
  updateAgentField,
  updateAgentList,
  updateDepartmentField,
  updateDepartmentList,
  updateDiscussionField,
  updateDiscussionNumber,
  updateTeamField,
} = editorSlice.actions;

export const editorReducer = editorSlice.reducer;