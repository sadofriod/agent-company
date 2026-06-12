import {
  addAgent as addAgentAction,
  addDepartment as addDepartmentAction,
  removeAgent as removeAgentAction,
  removeDepartment as removeDepartmentAction,
  updateAgentField as updateAgentFieldAction,
  updateAgentList as updateAgentListAction,
  updateAgentMetadataField as updateAgentMetadataFieldAction,
  updateAgentMetadataList as updateAgentMetadataListAction,
  updateDepartmentField as updateDepartmentFieldAction,
  updateDepartmentList as updateDepartmentListAction,
  updateDiscussionField as updateDiscussionFieldAction,
  updateDiscussionNumber as updateDiscussionNumberAction,
  updateTeamField as updateTeamFieldAction,
} from '../state/core/editorSlice';
import type { AppDispatch } from '../state/core/editorStore';

type DepartmentActions = {
  addDepartment: () => void;
  removeDepartment: (departmentId: string) => void;
  updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
};

type AgentActions = {
  addAgent: (departmentId: string) => void;
  removeAgent: (agentId: string) => void;
  updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  updateAgentMetadataField: (agentId: string, field: 'name' | 'description' | 'profile' | 'tool_policy', value: string) => void;
  updateAgentMetadataList: (agentId: string, field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands', value: string) => void;
};

type TeamAndDiscussionActions = {
  updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
};

export type TeamSchemaMutationModel = DepartmentActions & AgentActions & TeamAndDiscussionActions;

const useDepartmentActions = (dispatch: AppDispatch): DepartmentActions => {
  const addDepartment = (): void => {
    dispatch(addDepartmentAction());
  };
  const removeDepartment = (departmentId: string): void => {
    dispatch(removeDepartmentAction(departmentId));
  };
  const updateDepartmentField = (departmentId: string, field: 'name' | 'mission', value: string): void => {
    dispatch(updateDepartmentFieldAction({ departmentId, field, value }));
  };
  const updateDepartmentList = (
    departmentId: string,
    field: 'decision_scope' | 'handoff_contracts',
    value: string,
  ): void => {
    dispatch(updateDepartmentListAction({ departmentId, field, value }));
  };

  return { addDepartment, removeDepartment, updateDepartmentField, updateDepartmentList };
};

const useAgentActions = (dispatch: AppDispatch): AgentActions => {
  const addAgent = (departmentId: string): void => {
    dispatch(addAgentAction(departmentId));
  };
  const removeAgent = (agentId: string): void => {
    dispatch(removeAgentAction(agentId));
  };
  const updateAgentField = (agentId: string, field: 'role' | 'model' | 'description', value: string): void => {
    dispatch(updateAgentFieldAction({ agentId, field, value }));
  };
  const updateAgentList = (
    agentId: string,
    field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers',
    value: string,
  ): void => {
    dispatch(updateAgentListAction({ agentId, field, value }));
  };

  const updateAgentMetadataField = (
    agentId: string,
    field: 'name' | 'description' | 'profile' | 'tool_policy',
    value: string,
  ): void => {
    dispatch(updateAgentMetadataFieldAction({ agentId, field, value }));
  };

  const updateAgentMetadataList = (
    agentId: string,
    field: 'partials' | 'tools' | 'allowed_commands' | 'required_commands',
    value: string,
  ): void => {
    dispatch(updateAgentMetadataListAction({ agentId, field, value }));
  };

  return { addAgent, removeAgent, updateAgentField, updateAgentList, updateAgentMetadataField, updateAgentMetadataList };
};

const useTeamAndDiscussionActions = (dispatch: AppDispatch): TeamAndDiscussionActions => {
  const updateTeamField = (field: 'team_name' | 'team_id' | 'schema_version', value: string): void => {
    dispatch(updateTeamFieldAction({ field, value }));
  };
  const updateDiscussionField = (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string): void => {
    dispatch(updateDiscussionFieldAction({ field, value }));
  };
  const updateDiscussionNumber = (field: 'max_rounds', value: number): void => {
    dispatch(updateDiscussionNumberAction({ field, value }));
  };

  return { updateTeamField, updateDiscussionField, updateDiscussionNumber };
};

export const useTeamSchemaMutations = (dispatch: AppDispatch): TeamSchemaMutationModel => {
  const departments = useDepartmentActions(dispatch);
  const agents = useAgentActions(dispatch);
  const teamAndDiscussion = useTeamAndDiscussionActions(dispatch);

  return { ...departments, ...agents, ...teamAndDiscussion };
};
