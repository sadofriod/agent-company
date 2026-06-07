import type {
  CapabilityDescriptor,
  CapabilityRegistry,
} from '../../domain/capability';
import type {
  AgentId,
  CapabilityId,
  DepartmentId,
  MemoryProfileId,
  TeamId,
} from '../../domain/base';
import type {
  AgentDefinition,
  Department,
  MemoryRetrievalProfile,
} from '../../domain/organization';
import type { AgentGatewayBinding } from '../gateway/resolveAgentGatewayBinding';

export type AgentCapabilitySet = {
  readonly skills: readonly CapabilityDescriptor[];
  readonly mcpServers: readonly CapabilityDescriptor[];
  readonly tools: readonly CapabilityDescriptor[];
};

export type AgentAssembly = {
  readonly agentId: AgentId;
  readonly teamId: TeamId;
  readonly departmentId: DepartmentId;
  readonly role: string;
  readonly model: string;
  readonly description?: string;
  readonly inputContract: string;
  readonly outputContract: string;
  readonly responsibilities: readonly string[];
  readonly department: Department;
  readonly definition: AgentDefinition;
  readonly metadata?: AgentDefinition['metadata'];
  readonly gateway: AgentGatewayBinding;
  readonly memoryProfile?: MemoryRetrievalProfile;
  readonly capabilities: AgentCapabilitySet;
};

export type AgentAssemblyBundle = {
  readonly teamId: TeamId;
  readonly agents: readonly AgentAssembly[];
  readonly agentsById: ReadonlyMap<AgentId, AgentAssembly>;
};

export type AgentAssemblyFactory = {
  readonly assemble: (agentId: AgentId) => AgentAssembly;
  readonly assembleAll: () => AgentAssemblyBundle;
};

export type CapabilityIndex = ReadonlyMap<
  CapabilityId,
  CapabilityDescriptor
>;

export type MemoryProfilesById = ReadonlyMap<MemoryProfileId, MemoryRetrievalProfile>;

export type AgentAssemblyFactoryOptions = {
  readonly capabilityRegistry?: CapabilityRegistry;
};