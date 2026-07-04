import type { EvidenceRef, SchemaIssue, ValidationResult } from '../../domain/base';
import { PipelineInterruptionKind } from '../../domain/delivery';
import type {
	Handoff, 
	Pipeline,
	PipelineStep,
	StepResult,
	Ticket,
} from '../../domain/delivery';
import {
	REVIEW_STATUS,
	REVIEW_TARGET_TYPE,
	REVIEWER_KIND,
	type ReviewResult,
} from '../../domain/review';
import type { RuntimeSession } from '../../domain/runtime';
import { RUNTIME_EVENT_TYPE } from '../../domain/runtimeEvent';
import type {
	MemoryConflict,
	MemoryContextPackage,
	RetrievedMemory,
} from '../../domain/memory';
import { createAgentAssemblyFactory, type AgentAssembly } from '../../agent/assembly';
import {
	CAPABILITY_EXPIRY,
	CAPABILITY_SCOPE,
	CAPABILITY_TYPE,
	type CapabilityGrant,
	type CapabilityLoadPlan,
} from '../../domain/capability';
import {
	runLocalAgentStep,
	type AgentStepExecution,
	type AgentStepRunner,
} from '../agentStepRunner';

import {
	createIssue,
	createMemorySourceRef,
	createRuntimeScopedId,
	createStructuredSourceRef,
	createTimestamp,
	toCapabilityId,
	toHandoffId,
	toMemoryId,
	toPipelineId,
	toPipelineStepId,
} from '../runtimeEngineShared';
import { runReviewGate } from './review';
import {
	SESSION_COMPLETE_MESSAGE,
	applyInterruption,
	createEvidenceRef,
	createPipelineInterruption,
	uniqueValues,
	updateRuntimeSession,
} from './shared';

type ExecutePipelineStageOptions = {
	readonly stepRunner?: AgentStepRunner;
	readonly testScenarios?: RuntimeSession['state']['context']['testScenarios'];
};

const appendReviewEvents = (
	session: RuntimeSession,
	pipeline: Pipeline,
	step: PipelineStep,
	reviewResults: readonly ReviewResult[],
): RuntimeSession =>
	reviewResults.reduce<RuntimeSession>((currentSession, reviewResult) => {
		const eventType =
			reviewResult.status === REVIEW_STATUS.Block
				? RUNTIME_EVENT_TYPE.ReviewBlocked
				: reviewResult.status === REVIEW_STATUS.Revise
					? RUNTIME_EVENT_TYPE.ReviewReviseRequired
					: RUNTIME_EVENT_TYPE.ReviewStepCompleted;

		return updateRuntimeSession(
			currentSession,
			{},
			{
				eventType,
				reason: `Review ${reviewResult.reviewId} returned ${reviewResult.status} for step ${step.stepId}.`,
				metadata: {
					reviewId: reviewResult.reviewId,
					pipelineId: pipeline.pipelineId,
					stepId: step.stepId,
					reviewer: reviewResult.reviewer,
					status: reviewResult.status,
					issueCount: reviewResult.issues.length,
				},
			},
		);
	}, session);

const validatePipelineDag = (
	session: RuntimeSession,
	pipeline: Pipeline,
): ValidationResult<Pipeline> => {
	const issues: SchemaIssue[] = [];
	const stepsById = new Map(pipeline.steps.map((step) => [step.stepId, step]));
	const seenStepIds = new Set<string>();

	for (const step of pipeline.steps) {
		const stepId = step.stepId as string;

		if (seenStepIds.has(stepId)) {
			issues.push(createIssue('pipeline_invalid', ['steps'], `Duplicate pipeline step id: ${stepId}.`));
		}

		seenStepIds.add(stepId);

		if (step.ticketId !== pipeline.ticketId) {
			issues.push(
				createIssue('pipeline_invalid', ['steps', stepId], 'Pipeline step ticket_id must match pipeline ticket_id.'),
			);
		}

		for (const dependencyId of step.dependsOn) {
			if (!stepsById.has(dependencyId)) {
				issues.push(
					createIssue(
						'pipeline_invalid',
						['steps', stepId, 'depends_on'],
						`Pipeline dependency ${dependencyId} does not exist.`,
					),
				);
			}
		}
	}

	const inDegree = new Map(pipeline.steps.map((step) => [step.stepId, step.dependsOn.length]));
	const adjacency = new Map(pipeline.steps.map((step) => [step.stepId, [] as PipelineStep['stepId'][]]));

	for (const step of pipeline.steps) {
		for (const dependencyId of step.dependsOn) {
			adjacency.get(dependencyId)?.push(step.stepId);
		}
	}

	const queue = pipeline.steps.filter((step) => (inDegree.get(step.stepId) ?? 0) === 0).map((step) => step.stepId);
	let visitedCount = 0;

	while (queue.length > 0) {
		const currentStepId = queue.shift();

		if (currentStepId === undefined) {
			continue;
		}

		visitedCount += 1;

		for (const dependentStepId of adjacency.get(currentStepId) ?? []) {
			const nextDegree = (inDegree.get(dependentStepId) ?? 0) - 1;
			inDegree.set(dependentStepId, nextDegree);

			if (nextDegree === 0) {
				queue.push(dependentStepId);
			}
		}
	}

	if (visitedCount !== pipeline.steps.length) {
		issues.push(
			createIssue(
				'pipeline_cycle_detected',
				['steps'],
				'Pipeline steps do not form a valid DAG.',
				'Revise upstream planning or return to discussion.',
			),
		);
	}

	return issues.length === 0 ? { ok: true, value: pipeline } : { ok: false, issues };
};

const createPipelineForTicket = (session: RuntimeSession, ticket: Ticket): ValidationResult<Pipeline> => {
	const ownerAgent = session.runtimePlan.agentsById.get(ticket.ownerAgentId);

	if (ownerAgent === undefined) {
		return {
			ok: false,
			issues: [
				createIssue('pipeline_invalid', ['owner_agent_id'], 'Pipeline owner agent is missing from the Team Schema.'),
			],
		};
	}

	const departmentAgents = session.runtimePlan.team.agents.filter(
		(agent) => agent.departmentId === ownerAgent.departmentId,
	);
	const orderedAgents = uniqueValues([
		ownerAgent,
		...departmentAgents.filter((agent) => agent.agentId !== ownerAgent.agentId),
	]);
	const shouldInjectCapabilityMissing = session.state.context.testScenarios?.capabilityMissing === true;
	const shouldInjectPipelineCycle = session.state.context.testScenarios?.pipelineCycle === true;
	const pipelineId = toPipelineId(createRuntimeScopedId('pipeline'));
	const stepIds = orderedAgents.map(() => toPipelineStepId(createRuntimeScopedId('step')));
	const steps: PipelineStep[] = orderedAgents.map((agent, index) => ({
		stepId: stepIds[index] ?? toPipelineStepId(createRuntimeScopedId('step')),
		ticketId: ticket.ticketId,
		ownerAgentId: agent.agentId,
		title: `${agent.role} step`,
		dependsOn:
			index === 0
				? []
				: [stepIds[index - 1]].filter(
					(stepId): stepId is PipelineStep['stepId'] => stepId !== undefined,
				),
		inputContract: agent.inputContract,
		outputContract: agent.outputContract,
		allowedCapabilities: uniqueValues([
			...agent.skillIds,
			...agent.mcpServerIds,
			...agent.toolIds,
			...(shouldInjectCapabilityMissing && index === 0 ? ['__e2e_missing_capability__'] : []),
		]),
		reviewRequired: true,
		failurePolicy: ticket.failurePolicy,
	}));

	if (shouldInjectPipelineCycle && steps.length > 1) {
		const firstStep = steps[0];
		const lastStep = steps.at(-1);

		if (firstStep !== undefined && lastStep !== undefined) {
			steps[0] = {
				...firstStep,
				dependsOn: [lastStep.stepId].filter(
					(stepId): stepId is PipelineStep['stepId'] => stepId !== undefined,
				),
			};
		}
	}
	const pipeline: Pipeline = {
		pipelineId,
		ticketId: ticket.ticketId,
		steps,
	};

	return validatePipelineDag(session, pipeline);
};

const createMemoryContextPackage = (
	session: RuntimeSession,
	step: PipelineStep,
): MemoryContextPackage | undefined => {
	const agentAssembly = createAgentAssemblyFactory(session.runtimePlan).assemble(step.ownerAgentId);
	const memoryPolicy = session.runtimePlan.memoryPolicy;
	const profile = agentAssembly.memoryProfile;

	if (memoryPolicy === undefined || profile === undefined) {
		return undefined;
	}

	const reviewedTargetIds = new Set(
		session.state.reviewResults
			.filter((reviewResult) => reviewResult.status === REVIEW_STATUS.Pass)
			.map((reviewResult) => reviewResult.targetId),
	);
	const decisionMemories = profile.allowedScopes.includes('topic') && session.state.discussionResult !== undefined
		? session.state.discussionResult.decisions.map<RetrievedMemory>((decision) => ({
			memoryId: toMemoryId(`memory_decision_${decision.decisionId}`),
			sourceObjectType: 'decision',
			sourceObjectId: decision.decisionId,
			content: decision.conclusion,
			evidenceSummary: decision.rationale,
			score: 0.95,
			sourceRefs: decision.sourceRefs,
			reviewed: reviewedTargetIds.has(decision.decisionId),
			conflictIds: [],
			supersededByIds: [],
		}))
		: [];
	const handoffMemories = profile.allowedScopes.includes('ticket')
		? session.state.generatedHandoffs
			.filter((handoff) => handoff.ticketId === step.ticketId)
			.map<RetrievedMemory>((handoff) => ({
				memoryId: toMemoryId(`memory_handoff_${handoff.handoffId}`),
				sourceObjectType: 'handoff',
				sourceObjectId: handoff.handoffId,
				content: JSON.stringify(handoff.payload),
				evidenceSummary: `${handoff.inputContract} -> ${handoff.outputContract}`,
				score: 0.8,
				sourceRefs: handoff.evidenceRefs.map((entry) => entry.source),
				reviewed: reviewedTargetIds.has(handoff.handoffId),
				conflictIds: [],
				supersededByIds: [],
			}))
		: [];
	const sessionMemories = profile.allowedScopes.includes('session')
		? session.state.completedStepResults
			.filter((stepResult) => stepResult.ticketId === step.ticketId)
			.map<RetrievedMemory>((stepResult) => ({
				memoryId: toMemoryId(`memory_step_${stepResult.stepId}`),
				sourceObjectType: 'handoff',
				sourceObjectId: stepResult.stepId,
				content: JSON.stringify(stepResult.output),
				evidenceSummary: `Step output from ${stepResult.stepId}`,
				score: 0.75,
				sourceRefs: stepResult.evidenceRefs.map((entry) => entry.source),
				reviewed: reviewedTargetIds.has(stepResult.stepId),
				conflictIds: [],
				supersededByIds: [],
			}))
		: [];
	const retrievedMemories = [...decisionMemories, ...handoffMemories, ...sessionMemories]
		.filter((entry) => !profile.requireReviewedMemory || entry.reviewed)
		.slice(0, profile.maxResults);
	const conflictFlags: readonly MemoryConflict[] = [
		...(session.state.discussionResult?.conflicts
			.filter((conflict) => conflict.kind === 'memory_conflict')
			.map((conflict, index) => ({
				memoryId: toMemoryId(`memory_conflict_${index}`),
				conflictingWithIds: [],
				strategy: memoryPolicy.conflictStrategy,
				summary: conflict.summary,
			})) ?? []),
		...(session.state.context.testScenarios?.memoryConflictEscalation === true
			? [
				{
					memoryId: toMemoryId('memory_conflict_test_esc'),
					conflictingWithIds: [],
					strategy: memoryPolicy.conflictStrategy,
					summary: 'E2E memory conflict escalation simulation',
				},
			]
			: []),
	];

	const queryScope = profile.allowedScopes[0] ?? session.state.context.memoryScopes[0] ?? 'session';

	return {
		query: {
			requesterAgentId: step.ownerAgentId,
			scope: queryScope,
			query: `${step.title} ${session.state.context.task.goal}`,
			profileId: profile.profileId,
			ticketId: step.ticketId,
			...(session.state.discussionResult === undefined
				? {}
				: { topicId: session.state.discussionResult.topic.topicId }),
			stepId: step.stepId as string,
		},
		retrievalMode: memoryPolicy.retrievalMode,
		profile,
		retrievedMemories,
		retrievedMemoryIds: retrievedMemories.map((entry) => entry.memoryId),
		sourceRefs: retrievedMemories.flatMap((entry) => entry.sourceRefs),
		confidence: retrievedMemories.length === 0 ? 0 : Math.min(1, retrievedMemories.length / profile.maxResults),
		conflictFlags,
	};
};

const loadStepCapabilities = (
	session: RuntimeSession,
	step: PipelineStep,
): CapabilityLoadPlan => {
	const agent = session.runtimePlan.agentsById.get(step.ownerAgentId);

	if (agent === undefined) {
		return {
			scope: CAPABILITY_SCOPE.PipelineStep,
			targetId: step.stepId,
			grants: [],
			deniedCapabilityIds: step.allowedCapabilities.map(toCapabilityId),
		};
	}

	const capabilityTypeById = new Map<string, CapabilityGrant['capabilityType']>([
		...agent.skillIds.map((capabilityId) => [capabilityId, CAPABILITY_TYPE.Skill] as const),
		...agent.mcpServerIds.map((capabilityId) => [capabilityId, CAPABILITY_TYPE.McpServer] as const),
		...agent.toolIds.map((capabilityId) => [capabilityId, CAPABILITY_TYPE.Tool] as const),
	]);
	const grants: CapabilityGrant[] = [];
	const deniedCapabilityIds = step.allowedCapabilities
		.filter((capabilityId) => !capabilityTypeById.has(capabilityId))
		.map(toCapabilityId);

	for (const capabilityId of step.allowedCapabilities) {
		const capabilityType = capabilityTypeById.get(capabilityId);

		if (capabilityType === undefined) {
			continue;
		}

		grants.push({
			capabilityId: toCapabilityId(capabilityId),
			capabilityType,
			grantedToAgentId: step.ownerAgentId,
			grantedForStepId: step.stepId,
			scope: CAPABILITY_SCOPE.PipelineStep,
			reason: `Capability ${capabilityId} is declared on the step owner agent.`,
			sourceRefs: [createStructuredSourceRef(step.stepId, 'pipeline step')],
			expiresWhen: CAPABILITY_EXPIRY.StepCompleted,
		});
	}

	return {
		scope: CAPABILITY_SCOPE.PipelineStep,
		targetId: step.stepId,
		grants,
		deniedCapabilityIds,
	};
};

const assembleStepAgent = (
	session: RuntimeSession,
	step: PipelineStep,
): ValidationResult<AgentAssembly> => {
	if (!session.runtimePlan.agentsById.has(step.ownerAgentId)) {
		return {
			ok: false,
			issues: [
				createIssue(
					'agent_missing',
					['owner_agent_id'],
					`Pipeline step owner agent ${step.ownerAgentId} is missing from the runtime plan.`,
					'Return to discussion and select an agent declared in the Team Schema.',
				),
			],
		};
	}

	return {
		ok: true,
		value: createAgentAssemblyFactory(session.runtimePlan).assemble(step.ownerAgentId),
	};
};

export const promoteNextTicket = (session: RuntimeSession): ValidationResult<RuntimeSession> => {
	if (session.state.activeTicket !== undefined || session.state.activePipeline !== undefined) {
		return { ok: true, value: session };
	}

	const [nextTicket, ...remainingTickets] = session.state.pendingTickets;

	if (nextTicket === undefined) {
		return {
			ok: true,
			value: updateRuntimeSession(session, {
				nextAction:
					session.state.completedTickets.length > 0 || session.state.discussionResult !== undefined
						? SESSION_COMPLETE_MESSAGE
						: 'No admitted tickets are available for execution.',
			}),
		};
	}

	const pipelineValidation = createPipelineForTicket(session, nextTicket);

	if (!pipelineValidation.ok) {
		return {
			ok: true,
			value: applyInterruption(
				session,
				createPipelineInterruption(
					pipelineValidation.issues.some((issue) => issue.code === 'pipeline_cycle_detected')
						? PipelineInterruptionKind.PipelineCycleDetected
						: PipelineInterruptionKind.ReturnToDiscussion,
					'Pipeline validation failed during ticket promotion.',
					'return_to_discussion',
				),
			),
		};
	}

	const promotedSession = updateRuntimeSession(
		session,
		{
			pendingTickets: remainingTickets,
			activeTicket: nextTicket,
			activePipeline: pipelineValidation.value,
			interruption: undefined,
			nextAction: `Execute pipeline ${pipelineValidation.value.pipelineId} for ticket ${nextTicket.ticketId}.`,
			context: {
				activeTicketId: nextTicket.ticketId,
				currentAgentId: nextTicket.ownerAgentId,
			},
		},
		{
			eventType: RUNTIME_EVENT_TYPE.PipelineCreated,
			reason: `Created pipeline ${pipelineValidation.value.pipelineId} for ticket ${nextTicket.ticketId}.`,
			metadata: {
				pipelineId: pipelineValidation.value.pipelineId,
				ticketId: nextTicket.ticketId,
				stepCount: pipelineValidation.value.steps.length,
			},
		},
	);

	return { ok: true, value: promotedSession };
};

const createStepEvidenceRefs = (
	session: RuntimeSession,
	step: PipelineStep,
	memoryPackage: MemoryContextPackage | undefined,
	upstreamHandoffs: readonly Handoff[],
): readonly EvidenceRef[] => {
	if (session.state.context.testScenarios?.ragEvidenceMissing === true) {
		return [];
	}

	return [
		createEvidenceRef(createStructuredSourceRef(step.ticketId, 'ticket'), session.state.activeTicket?.goal),
		...(session.state.discussionResult === undefined
			? []
			: [
				createEvidenceRef(
					createStructuredSourceRef(session.state.discussionResult.topic.topicId, 'discussion topic'),
					session.state.discussionResult.topic.goal,
				),
			]),
		...upstreamHandoffs.flatMap((handoff) => handoff.evidenceRefs),
		...(memoryPackage?.retrievedMemories.map((memory) =>
			createEvidenceRef(createMemorySourceRef(memory.memoryId, memory.evidenceSummary), memory.content),
		) ?? []),
	];
};

const createStepResult = (
	session: RuntimeSession,
	step: PipelineStep,
	agentExecution: AgentStepExecution,
	memoryPackage: MemoryContextPackage | undefined,
	capabilityLoadPlan: CapabilityLoadPlan,
	evidenceRefs: readonly EvidenceRef[],
	upstreamHandoffs: readonly Handoff[],
): StepResult => ({
	stepId: step.stepId,
	ticketId: step.ticketId,
	ownerAgentId: step.ownerAgentId,
	output: {
		...agentExecution.output,
		summary: agentExecution.responseSummary,
		goal: session.state.activeTicket?.goal ?? session.state.context.task.goal,
		inputContract: step.inputContract,
		outputContract: step.outputContract,
		consumedHandoffIds: upstreamHandoffs.map((handoff) => handoff.handoffId),
		retrievedMemoryIds: memoryPackage?.retrievedMemoryIds ?? [],
		grantedCapabilities: capabilityLoadPlan.grants.map((grant) => grant.capabilityId),
		executedToolCalls: agentExecution.toolCalls,
		agentExecution: {
			runner: agentExecution.runner,
			agentId: agentExecution.agentId,
			role: agentExecution.role,
			model: agentExecution.model,
			gatewayProvider: agentExecution.gatewayProvider,
			promptSummary: agentExecution.promptSummary,
			responseSummary: agentExecution.responseSummary,
			memoryIds: agentExecution.memoryIds,
			consumedHandoffIds: agentExecution.consumedHandoffIds,
			toolCalls: agentExecution.toolCalls,
		},
		completedBy: step.ownerAgentId,
	},
	evidenceRefs,
	generatedAt: createTimestamp(),
});

const createHandoffsForStep = (
	pipeline: Pipeline,
	step: PipelineStep,
	stepResult: StepResult,
): readonly Handoff[] => {
	const dependentSteps = pipeline.steps.filter((candidate) => candidate.dependsOn.includes(step.stepId));

	if (dependentSteps.length === 0) {
		return [
			{
				handoffId: toHandoffId(createRuntimeScopedId('handoff')),
				ticketId: step.ticketId,
				fromStepId: step.stepId,
				fromAgentId: step.ownerAgentId,
				payload: stepResult.output,
				inputContract: step.inputContract,
				outputContract: step.outputContract,
				evidenceRefs: stepResult.evidenceRefs,
			},
		];
	}

	return dependentSteps.map((dependentStep) => ({
		handoffId: toHandoffId(createRuntimeScopedId('handoff')),
		ticketId: step.ticketId,
		fromStepId: step.stepId,
		toStepId: dependentStep.stepId,
		fromAgentId: step.ownerAgentId,
		toAgentId: dependentStep.ownerAgentId,
		payload: stepResult.output,
		inputContract: step.inputContract,
		outputContract: dependentStep.inputContract,
		evidenceRefs: stepResult.evidenceRefs,
	}));
};

const executeSingleStep = async (
	session: RuntimeSession,
	pipeline: Pipeline,
	step: PipelineStep,
	options: ExecutePipelineStageOptions,
): Promise<ValidationResult<RuntimeSession>> => {
	const upstreamHandoffs = session.state.generatedHandoffs.filter(
		(handoff) => handoff.ticketId === step.ticketId && step.dependsOn.includes(handoff.fromStepId),
	);

	if (step.dependsOn.length > upstreamHandoffs.length) {
		return {
			ok: true,
			value: applyInterruption(
				session,
				createPipelineInterruption(
					PipelineInterruptionKind.ReviseUpstream,
					'Upstream handoff is missing required fields for the current pipeline step.',
					'revise_upstream',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	const memoryPackage = createMemoryContextPackage(session, step);

	if (session.state.context.testScenarios?.memoryScopePollution === true) {
		const pollutedSession = updateRuntimeSession(
			session,
			{},
			{
				eventType: 'memory.write_denied',
				reason: 'Step executor attempted unauthorized write to system memory scope.',
				metadata: {
					pipelineId: pipeline.pipelineId,
					stepId: step.stepId,
					agentId: step.ownerAgentId,
					scope: 'system',
				},
			},
		);
		return {
			ok: true,
			value: applyInterruption(
				pollutedSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReturnToDiscussion,
					'Step executor attempted unauthorized write to system memory scope.',
					'return_to_discussion',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	if (session.state.context.testScenarios?.unauthorizedRetrieval === true) {
		const unauthorizedSession = updateRuntimeSession(
			session,
			{},
			{
				eventType: 'memory.retrieval_unauthorized',
				reason: 'Memory retrieval blocked: Agent requested unauthorized memory scope ("system").',
				metadata: {
					pipelineId: pipeline.pipelineId,
					stepId: step.stepId,
					agentId: step.ownerAgentId,
					scope: 'system',
				},
			},
		);
		return {
			ok: true,
			value: applyInterruption(
				unauthorizedSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReturnToDiscussion,
					'Agent requested unauthorized memory scope ("system").',
					'return_to_discussion',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	if ((memoryPackage?.conflictFlags.length ?? 0) > 0) {
		const conflictSession = updateRuntimeSession(
			session,
			{},
			{
				eventType: RUNTIME_EVENT_TYPE.MemoryConflictDetected,
				reason: `Memory retrieval detected conflicts for step ${step.stepId}.`,
				metadata: {
					pipelineId: pipeline.pipelineId,
					stepId: step.stepId,
					profileId: memoryPackage?.profile.profileId,
					result: 'conflict',
					conflictCount: memoryPackage?.conflictFlags.length ?? 0,
				},
			},
		);
		return {
			ok: true,
			value: applyInterruption(
				conflictSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReturnToDiscussion,
					'Memory retrieval returned conflicts that require review or supervisor arbitration.',
					'return_to_discussion',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	const capabilityLoadPlan = loadStepCapabilities(session, step);

	if (capabilityLoadPlan.deniedCapabilityIds.length > 0) {
		const deniedSession = updateRuntimeSession(
			session,
			{},
			{
				eventType: RUNTIME_EVENT_TYPE.CapabilityDenied,
				reason: `Step ${step.stepId} requested unauthorized capabilities.`,
				metadata: {
					pipelineId: pipeline.pipelineId,
					stepId: step.stepId,
					agentId: step.ownerAgentId,
					deniedCapabilityIds: capabilityLoadPlan.deniedCapabilityIds,
				},
			},
		);
		return {
			ok: true,
			value: applyInterruption(
				deniedSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReloadCapability,
					'Step requested capabilities that are not authorized for the owner agent.',
					'reload_capability',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	const agentAssembly = assembleStepAgent(session, step);

	if (!agentAssembly.ok) {
		return {
			ok: true,
			value: applyInterruption(
				session,
				createPipelineInterruption(
					PipelineInterruptionKind.ReloadCapability,
					'Pipeline step owner agent could not be assembled for execution.',
					'reload_capability',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	let workingSession = updateRuntimeSession(
		session,
		{
			latestMemoryPackage: memoryPackage,
			context: {
				currentAgentId: step.ownerAgentId,
			},
		},
		{
			eventType: RUNTIME_EVENT_TYPE.MemoryRetrieved,
			reason: `Retrieved scoped memory for step ${step.stepId}.`,
			metadata: {
				stepId: step.stepId,
				retrievedMemoryCount: memoryPackage?.retrievedMemories.length ?? 0,
				profileId: memoryPackage?.profile.profileId,
				result: 'success',
			},
		},
	);
	workingSession = updateRuntimeSession(
		workingSession,
		{},
		{
			eventType: RUNTIME_EVENT_TYPE.CapabilityLoaded,
			reason: `Loaded capabilities for step ${step.stepId}.`,
			metadata: {
				stepId: step.stepId,
				capabilityIds: capabilityLoadPlan.grants.map((grant) => grant.capabilityId),
			},
		},
	);
	workingSession = updateRuntimeSession(
		workingSession,
		{},
		{
			eventType: RUNTIME_EVENT_TYPE.PipelineStepStarted,
			reason: `Started agent ${step.ownerAgentId} for step ${step.stepId}.`,
			metadata: {
				pipelineId: pipeline.pipelineId,
				stepId: step.stepId,
				agentId: agentAssembly.value.agentId,
				role: agentAssembly.value.role,
				model: agentAssembly.value.gateway.llm.model,
				gatewayProvider: agentAssembly.value.gateway.llm.provider,
			},
		},
	);

	const evidenceRefs = createStepEvidenceRefs(workingSession, step, memoryPackage, upstreamHandoffs);
	const stepRunnerStartedAt = Date.now();
	const agentExecution = await (options.stepRunner ?? runLocalAgentStep)({
		session: workingSession,
		step,
		agent: agentAssembly.value,
		...(memoryPackage === undefined ? {} : { memoryPackage }),
		capabilityLoadPlan,
		upstreamHandoffs,
		evidenceRefs,
	});
	workingSession = updateRuntimeSession(
		workingSession,
		{},
		{
			eventType: RUNTIME_EVENT_TYPE.PipelineStepRunnerCompleted,
			reason: agentExecution.responseSummary,
			metadata: {
				pipelineId: pipeline.pipelineId,
				stepId: step.stepId,
				agentId: agentExecution.agentId,
				runner: agentExecution.runner,
				toolCallCount: agentExecution.toolCalls.length,
				retrievedMemoryCount: agentExecution.memoryIds.length,
				latencyMs: Date.now() - stepRunnerStartedAt,
				tokensIn: Math.max(1, Math.ceil(agentExecution.promptSummary.length / 4)),
				tokensOut: Math.max(1, Math.ceil(agentExecution.responseSummary.length / 4)),
				costUsd: Number(((agentExecution.promptSummary.length + agentExecution.responseSummary.length) / 10000).toFixed(6)),
				toolCalls: agentExecution.toolCalls,
			},
		},
	);
	const stepResult = createStepResult(
		workingSession,
		step,
		agentExecution,
		memoryPackage,
		capabilityLoadPlan,
		evidenceRefs,
		upstreamHandoffs,
	);
	const reviewResults = step.reviewRequired
		? runReviewGate(workingSession, {
			reviewers: [REVIEWER_KIND.LogicReview, REVIEWER_KIND.QualityReview],
			targetType: REVIEW_TARGET_TYPE.StepOutput,
			targetId: step.stepId,
			target: stepResult,
			evidenceRefs,
		})
		: [];
	workingSession = appendReviewEvents(workingSession, pipeline, step, reviewResults);
	const reviewStatuses = reviewResults.map((reviewResult) => reviewResult.status);

	if (reviewStatuses.includes(REVIEW_STATUS.Block)) {
		return {
			ok: true,
			value: applyInterruption(
				workingSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReturnToDiscussion,
					'Step review blocked further execution.',
					'return_to_discussion',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	if (reviewStatuses.includes(REVIEW_STATUS.Revise)) {
		return {
			ok: true,
			value: applyInterruption(
				workingSession,
				createPipelineInterruption(
					PipelineInterruptionKind.ReviseUpstream,
					'Step review requested upstream revision before continuing.',
					'revise_upstream',
					pipeline.pipelineId,
					step.stepId,
				),
			),
		};
	}

	const handoffs = createHandoffsForStep(pipeline, step, stepResult);
	let nextSession = updateRuntimeSession(
		workingSession,
		{
			latestStepResult: stepResult,
			completedStepResults: [...workingSession.state.completedStepResults, stepResult],
			generatedHandoffs: [...workingSession.state.generatedHandoffs, ...handoffs],
			latestReviewResult: reviewResults.at(-1),
			reviewResults: [...workingSession.state.reviewResults, ...reviewResults],
			interruption: undefined,
			nextAction: `Continue pipeline ${pipeline.pipelineId}.`,
		},
		{
			eventType: RUNTIME_EVENT_TYPE.PipelineStepCompleted,
			reason: `Completed pipeline step ${step.stepId}.`,
			metadata: {
				pipelineId: pipeline.pipelineId,
				stepId: step.stepId,
				handoffCount: handoffs.length,
			},
		},
	);

	for (const handoff of handoffs) {
		nextSession = updateRuntimeSession(
			nextSession,
			{},
			{
				eventType: RUNTIME_EVENT_TYPE.PipelineHandoffGenerated,
				reason: `Generated handoff ${handoff.handoffId} from step ${handoff.fromStepId}.`,
				metadata: {
					handoffId: handoff.handoffId,
					fromStepId: handoff.fromStepId,
					toStepId: handoff.toStepId,
				},
			},
		);
	}

	return { ok: true, value: nextSession };
};

const completeActivePipeline = (session: RuntimeSession): ValidationResult<RuntimeSession> => {
	if (session.state.activeTicket === undefined || session.state.activePipeline === undefined) {
		return { ok: true, value: session };
	}

	const completedTicket = session.state.activeTicket;
	const completedPipeline = session.state.activePipeline;
	const completedSession = updateRuntimeSession(
		session,
		{
			activeTicket: undefined,
			activePipeline: undefined,
			completedTickets: [...session.state.completedTickets, completedTicket],
			interruption: undefined,
			nextAction: `Pipeline ${completedPipeline.pipelineId} completed.`,
			context: {
				activeTicketId: undefined,
			},
		},
		{
			eventType: RUNTIME_EVENT_TYPE.PipelineCompleted,
			reason: `Completed pipeline ${completedPipeline.pipelineId}.`,
			metadata: {
				pipelineId: completedPipeline.pipelineId,
				ticketId: completedTicket.ticketId,
			},
		},
	);

	return promoteNextTicket(completedSession);
};

export const executePipelineStage = async (
	session: RuntimeSession,
	options: ExecutePipelineStageOptions = {},
): Promise<ValidationResult<RuntimeSession>> => {
	const promotion = promoteNextTicket(session);

	if (!promotion.ok) {
		return promotion;
	}

	let workingSession = promotion.value;
	const pipeline = workingSession.state.activePipeline;

	if (pipeline === undefined) {
		return { ok: true, value: workingSession };
	}

	const completedStepIds = new Set(
		workingSession.state.completedStepResults
			.filter((stepResult) => stepResult.ticketId === pipeline.ticketId)
			.map((stepResult) => stepResult.stepId)
	);
	const readySteps = pipeline.steps.filter(
		(step) =>
			!completedStepIds.has(step.stepId) &&
			step.dependsOn.every((dependencyId) => completedStepIds.has(dependencyId)),
	);

	if (readySteps.length === 0) {
		if (completedStepIds.size === pipeline.steps.length) { 
			return completeActivePipeline(workingSession);
		}

		return {
			ok: true,
			value: applyInterruption(
				workingSession,
				createPipelineInterruption(
					PipelineInterruptionKind.PipelineCycleDetected,
					'No executable pipeline step was available although the pipeline is incomplete.',
					'return_to_discussion',
					pipeline.pipelineId,
				),
			),
		};
	}

	for (const step of readySteps) {
		const result = await executeSingleStep(workingSession, pipeline, step, options);

		if (!result.ok) {
			return result;
		}

		workingSession = result.value;

		if (workingSession.state.interruption !== undefined) {
			return { ok: true, value: workingSession };
		}
	}

	const nextCompletedStepIds = new Set(
		workingSession.state.completedStepResults
			.filter((stepResult) => stepResult.ticketId === pipeline.ticketId)
			.map((stepResult) => stepResult.stepId),
	);

	if (nextCompletedStepIds.size === pipeline.steps.length) {
		return completeActivePipeline(workingSession);
	}

	return {
		ok: true,
		value: updateRuntimeSession(workingSession, {
			nextAction: `Continue pipeline ${pipeline.pipelineId}.`,
		}),
	};
};