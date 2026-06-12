import type { Selection, TeamSchemaDocument } from '../../model/types';

export type SelectionFormValues = Record<string, string | number>;

const renderListValue = (items: string[]): string => items.join('\n');

export const buildSelectionFormValues = (schema: TeamSchemaDocument, selection: Selection): SelectionFormValues => {
  if (selection.kind === 'team') {
    return {
      schema_version: schema.schema_version,
      team_id: schema.team_id,
      team_name: schema.team_name ?? '',
    };
  }

  if (selection.kind === 'department') {
    const department = schema.departments.find((candidate) => candidate.department_id === selection.departmentId);

    if (department === undefined) {
      return {};
    }

    return {
      name: department.name,
      mission: department.mission,
      decision_scope: renderListValue(department.decision_scope),
      handoff_contracts: renderListValue(department.handoff_contracts),
    };
  }

  if (selection.kind === 'agent') {
    const agent = schema.agents.find((candidate) => candidate.agent_id === selection.agentId);

    if (agent === undefined) {
      return {};
    }

    return {
      role: agent.role,
      model: agent.model,
      description: agent.description ?? '',
      responsibilities: renderListValue(agent.responsibilities),
      skills: renderListValue(agent.skills),
      tools: renderListValue(agent.tools),
      mcp_servers: renderListValue(agent.mcp_servers),
      memory_access_policy: agent.memory_access_policy ?? '',
      metadata_name: agent.metadata?.name ?? agent.agent_id,
      metadata_description: agent.metadata?.description ?? '',
      metadata_profile: agent.metadata?.profile ?? '',
      metadata_tool_policy: agent.metadata?.tool_policy ?? '',
      metadata_partials: renderListValue(agent.metadata?.partials ?? []),
      metadata_tools: renderListValue(agent.metadata?.tools ?? []),
      metadata_allowed_commands: renderListValue(agent.metadata?.allowed_commands ?? []),
      metadata_required_commands: renderListValue(agent.metadata?.required_commands ?? []),
    };
  }

  if (selection.kind === 'discussion') {
    return {
      mode: schema.discussion_policy.mode,
      max_rounds: schema.discussion_policy.max_rounds,
      supervisor_agent_id: schema.discussion_policy.supervisor_agent_id ?? '',
      conflict_resolution: schema.discussion_policy.conflict_resolution,
    };
  }

  return {};
};