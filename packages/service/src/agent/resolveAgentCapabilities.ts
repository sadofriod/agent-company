import {
  CAPABILITY_TYPE,
  type CapabilityRegistry,
  type CapabilityDescriptor,
} from '../domain/capability';
import type { CapabilityId } from '../domain/base';
import type { AgentDefinition } from '../domain/organization';
import type { AgentCapabilitySet, CapabilityIndex } from './types';

const resolveCapability = (
  capabilityId: CapabilityId,
  capabilityIndex: CapabilityIndex,
  capabilityType: CapabilityDescriptor['capabilityType'],
): CapabilityDescriptor =>
  capabilityIndex.get(capabilityId) ?? {
    capabilityId,
    capabilityType,
    available: false,
    description: 'Capability descriptor not found in registry.',
  };

const toCapabilityId = (capabilityId: string): CapabilityId => capabilityId as CapabilityId;

export const createCapabilityIndex = (
  capabilityRegistry?: CapabilityRegistry,
): CapabilityIndex => capabilityRegistry?.capabilities ?? new Map();

export const resolveAgentCapabilities = (
  agent: AgentDefinition,
  capabilityIndex: CapabilityIndex,
): AgentCapabilitySet => ({
  skills: agent.skillIds.map((capabilityId) =>
    resolveCapability(toCapabilityId(capabilityId), capabilityIndex, CAPABILITY_TYPE.Skill),
  ),
  mcpServers: agent.mcpServerIds.map((capabilityId) =>
    resolveCapability(toCapabilityId(capabilityId), capabilityIndex, CAPABILITY_TYPE.McpServer),
  ),
  tools: agent.toolIds.map((capabilityId) =>
    resolveCapability(toCapabilityId(capabilityId), capabilityIndex, CAPABILITY_TYPE.Tool),
  ),
});