import { createAgentAssemblyFactory, type AgentAssembly } from '../agent/assembly';
import type { TeamDefinition } from '../domain/organization';
import { createRuntimePlan } from './createRuntimePlan';

const serializeGatewayBinding = (agentAssembly: AgentAssembly) => ({
  agentId: agentAssembly.agentId,
  departmentId: agentAssembly.departmentId,
  role: agentAssembly.role,
  model: agentAssembly.model,
  gateway: agentAssembly.gateway,
  capabilities: agentAssembly.capabilities,
  memoryProfile: agentAssembly.memoryProfile,
});

export const buildAgentGatewayPayload = (team: TeamDefinition) => {
  const runtimePlan = createRuntimePlan(team);
  const assemblyFactory = createAgentAssemblyFactory(runtimePlan);
  const bundle = assemblyFactory.assembleAll();

  return {
    teamId: bundle.teamId,
    agents: bundle.agents.map(serializeGatewayBinding),
  };
};