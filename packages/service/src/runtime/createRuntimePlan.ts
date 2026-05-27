import { produce } from 'immer';

import type { RuntimePlan } from '../domain/runtime';
import type { TeamDefinition } from '../domain/organization';

const copyArray = <TValue>(values: readonly TValue[]): readonly TValue[] => [...values];

export const createRuntimePlan = (team: TeamDefinition): RuntimePlan => {
  const teamSnapshot = produce(team, (): TeamDefinition => ({
    ...team,
    departments: team.departments.map((department) => ({
      ...department,
      decisionScope: copyArray(department.decisionScope),
      agentIds: copyArray(department.agentIds),
      handoffContracts: copyArray(department.handoffContracts),
    })),
    agents: team.agents.map((agent) => ({
      ...agent,
      responsibilities: copyArray(agent.responsibilities),
      skillIds: copyArray(agent.skillIds),
      mcpServerIds: copyArray(agent.mcpServerIds),
      toolIds: copyArray(agent.toolIds),
      metadata:
        agent.metadata === undefined
          ? undefined
          : {
              ...agent.metadata,
              partials: copyArray(agent.metadata.partials),
              tools: copyArray(agent.metadata.tools),
              allowedCommands: copyArray(agent.metadata.allowedCommands),
              requiredCommands: copyArray(agent.metadata.requiredCommands),
            },
    })),
    discussionPolicy: {
      ...team.discussionPolicy,
      requiredOutputs: copyArray(team.discussionPolicy.requiredOutputs),
    },
    pipelinePolicy: { ...team.pipelinePolicy },
    memoryPolicy:
      team.memoryPolicy === undefined
        ? undefined
        : {
            ...team.memoryPolicy,
            indexedObjectTypes: copyArray(team.memoryPolicy.indexedObjectTypes),
            retrievalProfiles: team.memoryPolicy.retrievalProfiles.map((profile) => ({
              ...profile,
              allowedScopes: copyArray(profile.allowedScopes),
            })),
            evidenceRequiredForOutputs: copyArray(
              team.memoryPolicy.evidenceRequiredForOutputs,
            ),
          },
    reviewPolicy: {
      ...team.reviewPolicy,
      ticketAdmission: copyArray(team.reviewPolicy.ticketAdmission),
      stepCompletion: copyArray(team.reviewPolicy.stepCompletion),
      allowedResults: copyArray(team.reviewPolicy.allowedResults),
    },
  }));

  return {
    team: teamSnapshot,
    departmentsById: new Map(
      teamSnapshot.departments.map((department) => [department.departmentId, department]),
    ),
    agentsById: new Map(teamSnapshot.agents.map((agent) => [agent.agentId, agent])),
    discussionPolicy: teamSnapshot.discussionPolicy,
    pipelinePolicy: teamSnapshot.pipelinePolicy,
    memoryPolicy: teamSnapshot.memoryPolicy,
    reviewPolicy: teamSnapshot.reviewPolicy,
  };
};