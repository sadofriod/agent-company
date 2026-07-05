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

export type AgentStepRunner = (input: AgentStepRunnerInput) => Promise<AgentStepExecution>;

const DEFAULT_LLM_CALL_TIMEOUT_MS = 120000;

const resolveApiKey = (input: AgentStepRunnerInput): string | undefined => {
	const headers = input.agent.gateway.llm.headers;
	const authorization = headers.Authorization ?? headers.authorization;

	if (typeof authorization === 'string' && authorization.trim().length > 0) {
		return authorization;
	}

	const xApiKey = headers['x-api-key'] ?? headers['X-API-Key'];

	if (typeof xApiKey === 'string' && xApiKey.trim().length > 0) {
		return xApiKey;
	}

	const envName = input.agent.gateway.llm.apiKeyEnv;

	if (typeof envName === 'string' && envName.trim().length > 0) {
		const envValue = process.env[envName];

		if (typeof envValue === 'string' && envValue.trim().length > 0) {
			return envValue;
		}
	}

	return undefined;
};

const normalizeBaseUrl = (baseUrl: string | undefined): string => {
	const raw = (baseUrl ?? process.env.E2E_LMSTUDIO_BASE_URL ?? 'http://localhost:1234/v1').trim();

	if (raw.endsWith('/')) {
		return raw.slice(0, -1);
	}

	return raw;
};

const resolveChatCompletionsUrl = (baseUrl: string): string => {
	if (baseUrl.endsWith('/v1')) {
		return `${baseUrl}/chat/completions`;
	}

	return `${baseUrl}/v1/chat/completions`;
};

const toAlternativeLmStudioBaseUrls = (baseUrl: string): readonly string[] => {
	try {
		const parsed = new URL(baseUrl);

		if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
			return [baseUrl];
		}

		const hostInternal = new URL(baseUrl);
		hostInternal.hostname = 'host.docker.internal';

		return [baseUrl, hostInternal.toString().replace(/\/$/, '')];
	} catch {
		return [baseUrl];
	}
};

const toErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown LLM call error.';
};

const callOpenAiChatCompletion = async (input: AgentStepRunnerInput, promptSummary: string): Promise<string> => {
	const baseUrl = normalizeBaseUrl(input.agent.gateway.llm.baseUrl);
	const timeoutMs = Number.parseInt(process.env.LLM_CALL_TIMEOUT_MS ?? `${DEFAULT_LLM_CALL_TIMEOUT_MS}`, 10);
	const abortController = new AbortController();
	const shouldUseTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0;
	const timeout = shouldUseTimeout
		? setTimeout(() => abortController.abort(), timeoutMs)
		: undefined;
	const candidateBaseUrls = input.agent.gateway.llm.provider === 'lmstudio'
		? toAlternativeLmStudioBaseUrls(baseUrl)
		: [baseUrl];

	try {
		const apiKey = resolveApiKey(input);
		const headers: Record<string, string> = {
			'content-type': 'application/json',
			...input.agent.gateway.llm.headers,
		};

		if (apiKey !== undefined && headers.Authorization === undefined && headers.authorization === undefined) {
			headers.Authorization = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
		}

		const errors: string[] = [];

		for (const candidateBaseUrl of candidateBaseUrls) {
			const url = resolveChatCompletionsUrl(candidateBaseUrl);

			try {
				const response = await fetch(url, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						model: input.agent.gateway.llm.model,
						temperature: input.agent.gateway.llm.temperature,
						max_tokens: input.agent.gateway.llm.maxTokens,
						top_p: input.agent.gateway.llm.topP,
						messages: [
							{
								role: 'system',
								content: `You are ${input.agent.role}. Produce concise structured output for contract: ${input.step.outputContract}.`,
							},
							{
								role: 'user',
								content: promptSummary,
							},
						],
					}),
					signal: abortController.signal,
				});

				const payloadText = await response.text();

				if (!response.ok) {
					throw new Error(`LLM HTTP ${response.status}: ${payloadText}`);
				}

				const payload = JSON.parse(payloadText) as {
					choices?: Array<{
						message?: {
							content?: string;
						};
					}>;
				};
				const content = payload.choices?.[0]?.message?.content;

				if (typeof content !== 'string' || content.trim().length === 0) {
					throw new Error('LLM response does not contain choices[0].message.content');
				}

				return content.trim();
			} catch (error: unknown) {
				errors.push(`${url}: ${toErrorMessage(error)}`);
			}
		}

		throw new Error(errors.join(' | '));
	} finally {
		if (timeout !== undefined) {
			clearTimeout(timeout);
		}
	}
};

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

export const runLocalAgentStep: AgentStepRunner = async (input) => {
	const promptSummary = createPromptSummary(input);
	const toolCalls = createToolCalls(input);
	const memoryIds = input.memoryPackage?.retrievedMemoryIds ?? [];
	const consumedHandoffIds = input.upstreamHandoffs.map((handoff) => handoff.handoffId);

	let responseSummary: string;

	try {
		if (input.agent.gateway.llm.apiFormat === 'openai_chat') {
			responseSummary = await callOpenAiChatCompletion(input, promptSummary);
		} else {
			responseSummary = `${input.agent.role} produced ${input.step.outputContract} using ${toolCalls.length} tool call(s) and ${memoryIds.length} retrieved memory item(s).`;
		}
	} catch (error: unknown) {
		responseSummary = `LLM call failed, fallback response used. reason=${toErrorMessage(error)}`;
	}

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