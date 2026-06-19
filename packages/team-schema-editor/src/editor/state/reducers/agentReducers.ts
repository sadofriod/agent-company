import type { CaseReducer, PayloadAction } from '@reduxjs/toolkit';

import type { AgentDocument, AgentMetadataDocument } from '../../model/types';
import {
  AgentField,
  AgentMetadataField,
  createAgentId,
  ensureUniqueId,
  parseList,
  type AgentListField,
  type AgentMetadataListField,
  type EditorState,
  updateAgent,
  withSchema,
} from '../core/editorShared';

const createAgentMetadataBase = (agent: AgentDocument): AgentMetadataDocument => ({
  name: agent.metadata?.name ?? agent.agent_id,
  description: agent.metadata?.description ?? agent.description ?? 'Describe this agent.',
  ...(agent.metadata ?? {}),
});

export const updateAgentField: CaseReducer<
  EditorState,
  PayloadAction<{ agentId: string; field: AgentField; value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => {
    if (action.payload.field === AgentField.MemoryAccessPolicy) {
      const value = action.payload.value.trim();

      if (value.length === 0) {
        const { memory_access_policy, ...agentWithoutMemoryProfile } = agent;
        void memory_access_policy;

        return agentWithoutMemoryProfile;
      }

      return { ...agent, memory_access_policy: value };
    }

    return { ...agent, [action.payload.field]: action.payload.value };
  });

  Object.assign(state, withSchema(state, schema));
};

export const updateAgentList: CaseReducer<
  EditorState,
  PayloadAction<{ agentId: string; field: AgentListField; value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
    ...agent,
    [action.payload.field]: parseList(action.payload.value),
  }));

  Object.assign(state, withSchema(state, schema));
};

export const updateAgentMetadataField: CaseReducer<
  EditorState,
  PayloadAction<{ agentId: string; field: AgentMetadataField; value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => {
    const metadata = createAgentMetadataBase(agent);

    if (action.payload.field === AgentMetadataField.Profile || action.payload.field === AgentMetadataField.ToolPolicy) {
      const value = action.payload.value.trim().length === 0 ? undefined : action.payload.value;
      return { ...agent, metadata: { ...metadata, [action.payload.field]: value } };
    }

    return { ...agent, metadata: { ...metadata, [action.payload.field]: action.payload.value } };
  });

  Object.assign(state, withSchema(state, schema));
};

export const updateAgentMetadataList: CaseReducer<
  EditorState,
  PayloadAction<{ agentId: string; field: AgentMetadataListField; value: string }>
> = (state, action): void => {
  const schema = updateAgent(state.schema, action.payload.agentId, (agent) => ({
    ...agent,
    metadata: {
      ...createAgentMetadataBase(agent),
      [action.payload.field]: parseList(action.payload.value),
    },
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