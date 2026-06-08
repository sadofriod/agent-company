import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import { createDepartmentId, ensureUniqueId, type EditorState, type SchemaField, withSchema } from '../core/editorShared';

export const updateTeamField: CaseReducer<EditorState, PayloadAction<{ field: SchemaField; value: string }>> = (
  state,
  action,
): void => {
  const schema = {
    ...state.schema,
    [action.payload.field]: action.payload.value,
  };

  Object.assign(state, withSchema(state, schema));
};

export const addDepartment: CaseReducer<EditorState> = (state): void => {
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
};

export const removeDepartment: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
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
};