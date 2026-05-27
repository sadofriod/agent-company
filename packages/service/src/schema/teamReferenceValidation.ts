import type { SchemaIssue, ValidationResult } from '../domain/base';
import type { TeamDefinition } from '../domain/organization';
import { issue } from './teamSchemaShared';

const validateUniqueIds = (
  values: readonly string[],
  pathPrefix: readonly string[],
  fieldName: string,
  issues: SchemaIssue[],
): void => {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) {
      issues.push(
        issue(
          'reference_invalid',
          [...pathPrefix, String(index), fieldName],
          `字段值 ${value} 必须唯一。`,
        ),
      );
      return;
    }

    seen.add(value);
  });
};

export const validateTeamReferences = (
  team: TeamDefinition,
): ValidationResult<TeamDefinition> => {
  const issues: SchemaIssue[] = [];
  const departmentIds = new Set(team.departments.map((department) => department.departmentId));
  const agentIds = new Set(team.agents.map((agent) => agent.agentId));
  const retrievalProfileIds = new Set(
    team.memoryPolicy?.retrievalProfiles.map((profile) => profile.profileId) ?? [],
  );

  validateUniqueIds(
    team.departments.map((department) => department.departmentId as string),
    ['departments'],
    'department_id',
    issues,
  );
  validateUniqueIds(
    team.agents.map((agent) => agent.agentId as string),
    ['agents'],
    'agent_id',
    issues,
  );

  team.departments.forEach((department, index) => {
    if (department.agentIds.length === 0) {
      issues.push(
        issue('reference_invalid', ['departments', String(index), 'agents'], '部门至少需要一个 Agent。'),
      );
    }

    department.agentIds.forEach((agentId, agentIndex) => {
      if (!agentIds.has(agentId)) {
        issues.push(
          issue(
            'reference_invalid',
            ['departments', String(index), 'agents', String(agentIndex)],
            `部门引用了不存在的 Agent: ${agentId}`,
          ),
        );
      }
    });
  });

  team.agents.forEach((agent, index) => {
    if (!departmentIds.has(agent.departmentId)) {
      issues.push(
        issue(
          'reference_invalid',
          ['agents', String(index), 'department_id'],
          `Agent 引用了不存在的 Department: ${agent.departmentId}`,
        ),
      );
    }

    if (
      agent.memoryAccessProfileId !== undefined &&
      team.memoryPolicy !== undefined &&
      !retrievalProfileIds.has(agent.memoryAccessProfileId)
    ) {
      issues.push(
        issue(
          'reference_invalid',
          ['agents', String(index), 'memory_access_policy'],
          `Agent 引用了不存在的 memory profile: ${agent.memoryAccessProfileId}`,
        ),
      );
    }
  });

  if (
    team.discussionPolicy.supervisorAgentId !== undefined &&
    !agentIds.has(team.discussionPolicy.supervisorAgentId)
  ) {
    issues.push(
      issue(
        'reference_invalid',
        ['discussion_policy', 'supervisor_agent_id'],
        `supervisor_agent_id 引用了不存在的 Agent: ${team.discussionPolicy.supervisorAgentId}`,
      ),
    );
  }

  return issues.length === 0 ? { ok: true, value: team } : { ok: false, issues };
};