import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import { createAgentId, ensureUniqueId, parseList, type AgentField, type AgentListField, type EditorState, updateAgent, withSchema } from '../core/editorShared';

export const updateAgentField: CaseReducer<
  EditorState,
  PayloadAction<{ readonly agentId: string; readonly field: AgentField; readonly value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
    ...agent,
    [action.payload.field]: action.payload.value,
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateAgentList: CaseReducer<
  EditorState,
  PayloadAction<{ readonly agentId: string; readonly field: AgentListField; readonly value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
    ...agent,
    [action.payload.field]: parseList(action.payload.value),
  }));

  Object.assign(state, withSchema(state, schema));
};

export const addAgent: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
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
};

export const removeAgent: CaseReducer<EditorState, PayloadAction<string>> = (state, action): void => {
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
};