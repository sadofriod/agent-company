import { createAgentAssemblyFactory, type AgentAssembly, type AgentAssemblyBundle } from '../agent/assembly';
import type { TeamDefinition } from '../domain/organization';
import type { RuntimePlan } from '../domain/runtime';
import { createRuntimePlan } from './createRuntimePlan';

const serializeRuntimePlan = (runtimePlan: RuntimePlan) => ({
	team: runtimePlan.team,
	departments: [...runtimePlan.departmentsById.values()],
	agents: [...runtimePlan.agentsById.values()],
	discussionPolicy: runtimePlan.discussionPolicy,
	memoryPolicy: runtimePlan.memoryPolicy,
});

const serializeAgentAssembly = (agentAssembly: AgentAssembly) => ({
	agentId: agentAssembly.agentId,
	teamId: agentAssembly.teamId,
	departmentId: agentAssembly.departmentId,
	role: agentAssembly.role,
	model: agentAssembly.model,
	description: agentAssembly.description,
	inputContract: agentAssembly.inputContract,
	outputContract: agentAssembly.outputContract,
	responsibilities: agentAssembly.responsibilities,
	department: agentAssembly.department,
	definition: agentAssembly.definition,
	metadata: agentAssembly.metadata,
	gateway: agentAssembly.gateway,
	memoryProfile: agentAssembly.memoryProfile,
	capabilities: agentAssembly.capabilities,
});

const serializeAgentAssemblyBundle = (bundle: AgentAssemblyBundle) => ({
	teamId: bundle.teamId,
	agents: bundle.agents.map(serializeAgentAssembly),
});

export const buildRuntimePlanPayload = (team: TeamDefinition) => {
	const runtimePlan = createRuntimePlan(team);
	const assemblyFactory = createAgentAssemblyFactory(runtimePlan);

	return {
		runtimePlan: serializeRuntimePlan(runtimePlan),
		agentAssembly: serializeAgentAssemblyBundle(assemblyFactory.assembleAll()),
	};
};