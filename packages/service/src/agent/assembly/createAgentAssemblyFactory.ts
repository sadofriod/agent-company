import type { AgentId } from '../../domain/base';
import type { RuntimePlan } from '../../domain/runtime';
import { resolveAgentGatewayBinding } from '../gateway/resolveAgentGatewayBinding';
import { createCapabilityIndex, resolveAgentCapabilities } from './resolveAgentCapabilities';
import { resolveMemoryProfilesById } from './resolveMemoryProfilesById';
import type {
  AgentAssembly,
  AgentAssemblyBundle,
  AgentAssemblyFactory,
  AgentAssemblyFactoryOptions,
} from './types';

const cloneAgentMetadata = (
  metadata: AgentAssembly['metadata'],
): AgentAssembly['metadata'] =>
  metadata === undefined
    ? undefined
    : {
        ...metadata,
        partials: [...metadata.partials],
        tools: [...metadata.tools],
        allowedCommands: [...metadata.allowedCommands],
        requiredCommands: [...metadata.requiredCommands],
        llm:
          metadata.llm === undefined
            ? undefined
            : {
                ...metadata.llm,
                headers: { ...metadata.llm.headers },
              },
      };

const createAssembly = (
  runtimePlan: RuntimePlan,
  agentId: AgentId,
  memoryProfilesById: ReturnType<typeof resolveMemoryProfilesById>,
  capabilityIndex: ReturnType<typeof createCapabilityIndex>,
): AgentAssembly => {
  const agent = runtimePlan.agentsById.get(agentId);
  if (agent === undefined) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const department = runtimePlan.departmentsById.get(agent.departmentId);
  if (department === undefined) {
    throw new Error(`Unknown department for agent ${agentId}: ${agent.departmentId}`);
  }

  return {
    agentId: agent.agentId,
    teamId: runtimePlan.team.teamId,
    departmentId: agent.departmentId,
    role: agent.role,
    model: agent.model,
    description: agent.description,
    inputContract: agent.inputContract,
    outputContract: agent.outputContract,
    responsibilities: [...agent.responsibilities],
    department,
    definition: agent,
    metadata: cloneAgentMetadata(agent.metadata),
    gateway: resolveAgentGatewayBinding(agent),
    memoryProfile:
      agent.memoryAccessProfileId === undefined
        ? undefined
        : memoryProfilesById.get(agent.memoryAccessProfileId),
    capabilities: resolveAgentCapabilities(agent, capabilityIndex),
  };
};

export const createAgentAssemblyFactory = (
  runtimePlan: RuntimePlan,
  options: AgentAssemblyFactoryOptions = {},
): AgentAssemblyFactory => {
  const capabilityIndex = createCapabilityIndex(options.capabilityRegistry);
  const memoryProfilesById = resolveMemoryProfilesById(runtimePlan);
  const cache = new Map<AgentId, AgentAssembly>();

  const assemble = (agentId: AgentId): AgentAssembly => {
    const cachedAssembly = cache.get(agentId);
    if (cachedAssembly !== undefined) {
      return cachedAssembly;
    }

    const assembly = createAssembly(runtimePlan, agentId, memoryProfilesById, capabilityIndex);

    cache.set(agentId, assembly);

    return assembly;
  };

  const assembleAll = (): AgentAssemblyBundle => {
    const agents = runtimePlan.team.agents.map((agent) => assemble(agent.agentId));

    return {
      teamId: runtimePlan.team.teamId,
      agents,
      agentsById: new Map(agents.map((agent) => [agent.agentId, agent])),
    };
  };

  return {
    assemble,
    assembleAll,
  };
};