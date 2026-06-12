import type { AgentAssembly } from '../agent/assembly';
import type { EvidenceRef } from '../domain/base';
import {
	CAPABILITY_TYPE,
	type CapabilityGrant,
	type CapabilityLoadPlan,
} from '../domain/capability';
import type { Handoff, PipelineStep } from '../domain/delivery';
import type { MemoryContextPackage } from '../domain/memory';
import type { RuntimeSession } from '../domain/runtime';

export type AgentToolCallRecord = {
	readonly callId: string;
	readonly capabilityId: string;
	readonly capabilityType: CapabilityGrant['capabilityType'];
	readonly status: 'completed';
	readonly inputSummary: string;
	readonly outputSummary: string;
};

export type AgentStepExecution = {
	readonly runner: 'local_agent_step_runner';
	readonly agentId: string;
	readonly role: string;
	readonly model: string;
	readonly gatewayProvider: string;
	readonly promptSummary: string;
	readonly responseSummary: string;
	readonly memoryIds: readonly string[];
	readonly consumedHandoffIds: readonly string[];
	readonly toolCalls: readonly AgentToolCallRecord[];
	readonly output: Readonly<Record<string, unknown>>;
};

export type AgentStepRunnerInput = {
	readonly session: RuntimeSession;
	readonly step: PipelineStep;
	readonly agent: AgentAssembly;
	readonly memoryPackage?: MemoryContextPackage;
	readonly capabilityLoadPlan: CapabilityLoadPlan;
	readonly upstreamHandoffs: readonly Handoff[];
	readonly evidenceRefs: readonly EvidenceRef[];
};

export type AgentStepRunner = (input: AgentStepRunnerInput) => AgentStepExecution;

const createPromptSummary = (input: AgentStepRunnerInput): string => {
	const task = input.session.state.context.task;
	const memoryCount = input.memoryPackage?.retrievedMemories.length ?? 0;

	return [
		`${input.agent.role} executes ${input.step.title}.`,
		`Task: ${task.title}.`,
		`Goal: ${task.goal}.`,
		`Input contract: ${input.step.inputContract}.`,
		`Output contract: ${input.step.outputContract}.`,
		`Scoped memories: ${memoryCount}.`,
		`Upstream handoffs: ${input.upstreamHandoffs.length}.`,
	].join(' ');
};

const createToolCalls = (input: AgentStepRunnerInput): readonly AgentToolCallRecord[] =>
	input.capabilityLoadPlan.grants
		.filter((grant) => grant.capabilityType !== CAPABILITY_TYPE.Skill)
		.map((grant, index) => ({
			callId: `${input.step.stepId}:${grant.capabilityId}:${index + 1}`,
			capabilityId: grant.capabilityId,
			capabilityType: grant.capabilityType,
			status: 'completed',
			inputSummary: `${input.agent.agentId} requested ${grant.capabilityId} for ${input.step.stepId}.`,
			outputSummary: `${grant.capabilityId} returned governed context for ${input.step.outputContract}.`,
		}));

export const runLocalAgentStep: AgentStepRunner = (input) => {
	const promptSummary = createPromptSummary(input);
	const toolCalls = createToolCalls(input);
	const memoryIds = input.memoryPackage?.retrievedMemoryIds ?? [];
	const consumedHandoffIds = input.upstreamHandoffs.map((handoff) => handoff.handoffId);
	const responseSummary = `${input.agent.role} produced ${input.step.outputContract} using ${toolCalls.length} tool call(s) and ${memoryIds.length} retrieved memory item(s).`;

	return {
		runner: 'local_agent_step_runner',
		agentId: input.agent.agentId,
		role: input.agent.role,
		model: input.agent.gateway.llm.model,
		gatewayProvider: input.agent.gateway.llm.provider,
		promptSummary,
		responseSummary,
		memoryIds,
		consumedHandoffIds,
		toolCalls,
		output: {
			summary: responseSummary,
			goal: input.session.state.activeTicket?.goal ?? input.session.state.context.task.goal,
			agentId: input.agent.agentId,
			agentRole: input.agent.role,
			departmentId: input.agent.departmentId,
			inputContract: input.step.inputContract,
			outputContract: input.step.outputContract,
			consumedHandoffIds,
			retrievedMemoryIds: memoryIds,
			grantedCapabilities: input.capabilityLoadPlan.grants.map((grant) => grant.capabilityId),
			executedToolCalls: toolCalls,
			gateway: {
				provider: input.agent.gateway.llm.provider,
				model: input.agent.gateway.llm.model,
				apiFormat: input.agent.gateway.llm.apiFormat,
			},
			memory: input.memoryPackage === undefined
				? undefined
				: {
					retrievalMode: input.memoryPackage.retrievalMode,
					profileId: input.memoryPackage.profile.profileId,
					confidence: input.memoryPackage.confidence,
					retrievedMemoryIds: memoryIds,
				},
			evidenceCount: input.evidenceRefs.length,
			completedBy: input.agent.agentId,
		},
	};
};