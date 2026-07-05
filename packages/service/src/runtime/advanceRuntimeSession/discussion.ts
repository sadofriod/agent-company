import type { ValidationResult } from '../../domain/base';
import { DiscussionConflictKind } from '../../domain/discussion';
import type {
	Decision,
	DiscussionConflict,
	DiscussionResult,
	DiscussionTurn,
	PendingItem,
	Subtopic,
	TicketDraft,
	Topic,
} from '../../domain/discussion';
import type { Ticket } from '../../domain/delivery';
import {
	DISCUSSION_MODE,
	type AgentDefinition,
	type Department,
} from '../../domain/organization';
import type { ReviewResult } from '../../domain/review';
import { WORK_MODE, type RuntimeSession } from '../../domain/runtime';
import { RUNTIME_EVENT_TYPE } from '../../domain/runtimeEvent';

import {
	createDocumentSourceRef,
	createRuntimeScopedId,
	toDecisionId,
	toTicketDraftId,
	toTopicId,
} from '../runtimeEngineShared';
import { promoteNextTicket } from './pipeline';
import { admitTicketDraft } from './review';
import {
	applyInterruption,
	createEvidenceRef,
	tokenize,
	uniqueValues,
	updateRuntimeSession,
} from './shared';
import { createAgentAssemblyFactory } from '../../agent/assembly/createAgentAssemblyFactory';
import { callAgentLlm } from '../../agent/gateway/callAgentLlm';

const getDepartmentScore = (
	department: Department,
	agents: readonly AgentDefinition[],
	tokens: ReadonlySet<string>,
): number => {
	const departmentTokens = [
		...tokenize(department.name),
		...tokenize(department.mission),
		...department.decisionScope.flatMap(tokenize),
		...department.handoffContracts.flatMap(tokenize),
		...agents.flatMap((agent) => [
			...tokenize(agent.role),
			...tokenize(agent.description ?? ''),
			...agent.responsibilities.flatMap(tokenize),
		]),
	];

	return departmentTokens.reduce((score, token) => score + (tokens.has(token) ? 1 : 0), 0);
};

const createParticipantDepartments = (session: RuntimeSession): readonly Department[] => {
	const tokens = new Set(
		[
			session.state.context.task.title,
			session.state.context.task.goal,
			...session.state.context.task.constraints,
		]
			.flatMap(tokenize),
	);
	const scoredDepartments = session.runtimePlan.team.departments.map((department) => ({
		department,
		score: getDepartmentScore(
			department,
			session.runtimePlan.team.agents.filter((agent) => agent.departmentId === department.departmentId),
			tokens,
		),
	}));
	const positiveScores = scoredDepartments.filter((entry) => entry.score > 0);

	if (positiveScores.length > 0) {
		return positiveScores.map((entry) => entry.department);
	}

	return session.runtimePlan.team.departments;
};

const selectLeadAgent = (
	session: RuntimeSession,
	departmentId: Department['departmentId'],
): AgentDefinition | undefined => {
	const departmentAgents = session.runtimePlan.team.agents.filter((agent) => agent.departmentId === departmentId);

	return departmentAgents.find((agent) => /owner|lead|supervisor/i.test(agent.role)) ?? departmentAgents[0];
};

const resolveOwnerDepartment = (
	session: RuntimeSession,
	participantDepartments: readonly Department[],
): {
	readonly ownerDepartment?: Department;
	readonly conflicts: readonly DiscussionConflict[];
	readonly pendingItems: readonly PendingItem[];
	readonly arbiterAgentId?: RuntimeSession['state']['context']['currentAgentId'];
} => {
	const tokens = new Set(
		[
			session.state.context.task.title,
			session.state.context.task.goal,
			...session.state.context.task.constraints,
		]
			.flatMap(tokenize),
	);
	const scoredParticipants = participantDepartments.map((department) => ({
		department,
		score: getDepartmentScore(
			department,
			session.runtimePlan.team.agents.filter((agent) => agent.departmentId === department.departmentId),
			tokens,
		),
	}));
	const highestScore = Math.max(...scoredParticipants.map((entry) => entry.score));
	const winners = scoredParticipants.filter((entry) => entry.score === highestScore).map((entry) => entry.department);
	const supervisorAgent =
		session.runtimePlan.discussionPolicy.supervisorAgentId === undefined
			? undefined
			: session.runtimePlan.agentsById.get(session.runtimePlan.discussionPolicy.supervisorAgentId);

	if (winners.length === 1) {
		return {
			ownerDepartment: winners[0],
			conflicts: [],
			pendingItems: [],
			arbiterAgentId: supervisorAgent?.agentId,
		};
	}

	if (
		session.runtimePlan.discussionPolicy.conflictResolution === 'supervisor_decision' &&
		supervisorAgent !== undefined
	) {
		return {
			ownerDepartment:
				session.runtimePlan.departmentsById.get(supervisorAgent.departmentId) ?? winners[0],
			conflicts: [],
			pendingItems: [],
			arbiterAgentId: supervisorAgent.agentId,
		};
	}

	if (session.runtimePlan.discussionPolicy.conflictResolution === 'owner_decision') {
		const firstWinner = winners[0];

		if (firstWinner === undefined) {
			return {
				conflicts: [],
				pendingItems: [],
			};
		}

		return {
			ownerDepartment: firstWinner,
			conflicts: [],
			pendingItems: [],
			arbiterAgentId: selectLeadAgent(session, firstWinner.departmentId)?.agentId,
		};
	}

	const conflict: DiscussionConflict = {
		kind: DiscussionConflictKind.OwnerConflict,
		summary: 'Multiple departments matched the task equally and conflict resolution requires escalation.',
		ownerDepartmentIds: winners.map((department) => department.departmentId),
		relatedDecisionIds: [],
	};

	return {
		conflicts: [conflict],
		pendingItems: [
			{
				summary: 'Resolve owner department conflict before pipeline admission.',
				blockingReason: conflict.summary,
			},
		],
		arbiterAgentId: supervisorAgent?.agentId,
	};
};

// ---------------------------------------------------------------------------
// LLM-backed discussion turn execution (per mode)
// ---------------------------------------------------------------------------

const buildTurnEvidenceRef = (session: RuntimeSession): ReturnType<typeof createEvidenceRef> =>
	createEvidenceRef(
		createDocumentSourceRef(session.state.context.traceId, 'runtime task trace'),
		session.state.context.task.goal,
	);

/** Call one agent for their discussion turn and return structured output. */
const callAgentTurn = async (
	session: RuntimeSession,
	agent: AgentDefinition,
	systemPrompt: string,
	userPrompt: string,
	round: number,
	ownerDepartmentId: string | undefined,
	mode: string,
): Promise<DiscussionTurn> => {
	const assembly = createAgentAssemblyFactory(session.runtimePlan).assemble(agent.agentId);
	const fallback = `${agent.role} contributed to discussion in ${mode} mode.`;
	const recommendation = await callAgentLlm({
		gateway: assembly.gateway,
		systemPrompt,
		userPrompt,
		fallbackResponse: fallback,
	});

	return {
		round,
		agentId: agent.agentId,
		departmentId: agent.departmentId,
		promptSummary: userPrompt,
		structuredOutput: {
			recommendation,
			ownerDepartmentId,
			mode,
		},
		evidenceRefs: [buildTurnEvidenceRef(session)],
	};
};

/**
 * supervisor_led: Supervisor asks each department lead for input (round n),
 * then makes a final arbitration call (last round).
 */
const executeSupervisorLedTurns = async (
	session: RuntimeSession,
	orderedAgents: readonly AgentDefinition[],
	supervisorAgent: AgentDefinition | undefined,
	topic: Topic,
	ownerDepartmentId: string | undefined,
): Promise<readonly DiscussionTurn[]> => {
	const mode = DISCUSSION_MODE.SupervisorLed;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;
	const deptLeads = orderedAgents.filter((a) => a.agentId !== supervisorAgent?.agentId);
	const turns: DiscussionTurn[] = [];

	// Dept leads give their perspective
	for (let i = 0; i < deptLeads.length; i++) {
		const agent = deptLeads[i]!;
		const systemPrompt = `You are ${agent.role} in department ${agent.departmentId}. Provide your department's perspective on the task.`;
		const userPrompt = `${taskCtx} Topic: ${topic.goal}. Constraints: ${topic.constraints.join('; ')}. What is your department's recommendation?`;
		turns.push(await callAgentTurn(session, agent, systemPrompt, userPrompt, i + 1, ownerDepartmentId, mode));
	}

	// Supervisor arbitrates
	if (supervisorAgent !== undefined) {
		const priorRecommendations = turns.map((t) => `${t.agentId}: ${String(t.structuredOutput.recommendation)}`).join('\n');
		const systemPrompt = `You are ${supervisorAgent.role}. Review all department inputs and produce the final decision.`;
		const userPrompt = `${taskCtx}\n\nDepartment inputs:\n${priorRecommendations}\n\nMake a final decision on owner department and execution plan.`;
		turns.push(await callAgentTurn(session, supervisorAgent, systemPrompt, userPrompt, turns.length + 1, ownerDepartmentId, mode));
	}

	return turns;
};

/**
 * sequential_handoff: Each agent gets the previous agent's recommendation as context.
 */
const executeSequentialHandoffTurns = async (
	session: RuntimeSession,
	orderedAgents: readonly AgentDefinition[],
	topic: Topic,
	ownerDepartmentId: string | undefined,
): Promise<readonly DiscussionTurn[]> => {
	const mode = DISCUSSION_MODE.SequentialHandoff;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;

	const collectTurns = async (
		remaining: readonly AgentDefinition[],
		previousRecommendation: string,
		accumulated: DiscussionTurn[],
		index: number,
	): Promise<DiscussionTurn[]> => {
		if (remaining.length === 0) {
			return accumulated;
		}

		const [agent, ...rest] = remaining;
		if (agent === undefined) {
			return accumulated;
		}
		const systemPrompt = `You are ${agent.role}. Build upon the prior agent's analysis for this task.`;
		const handoffContext = previousRecommendation.length > 0
			? `\n\nPrevious agent's analysis:\n${previousRecommendation}`
			: '';
		const userPrompt = `${taskCtx} Topic: ${topic.goal}.${handoffContext}\n\nProvide your recommendation for the next stage.`;
		const turn = await callAgentTurn(session, agent, systemPrompt, userPrompt, index + 1, ownerDepartmentId, mode);
		accumulated.push(turn);
		return collectTurns(rest, String(turn.structuredOutput.recommendation), accumulated, index + 1);
	};

	return collectTurns(orderedAgents, '', [], 0);
};

/**
 * parallel_review: All agents produce independent input simultaneously (implemented
 * sequentially for safety); their outputs are collected without cross-dependency.
 */
const executeParallelReviewTurns = async (
	session: RuntimeSession,
	orderedAgents: readonly AgentDefinition[],
	topic: Topic,
	ownerDepartmentId: string | undefined,
): Promise<readonly DiscussionTurn[]> => {
	const mode = DISCUSSION_MODE.ParallelReview;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;

	const turnPromises = orderedAgents.map((agent) => {
		const systemPrompt = `You are ${agent.role}. Independently review this task and provide your recommendation.`;
		const userPrompt = `${taskCtx} Topic: ${topic.goal}. Constraints: ${topic.constraints.join('; ')}. What is your independent recommendation?`;
		return callAgentTurn(session, agent, systemPrompt, userPrompt, 1, ownerDepartmentId, mode);
	});

	return Promise.all(turnPromises);
};

const createDiscussionTurnsAsync = async (
	session: RuntimeSession,
	participantDepartments: readonly Department[],
	topic: Topic,
	ownerDepartmentId: Department['departmentId'] | undefined,
): Promise<readonly DiscussionTurn[]> => {
	const departmentLeadAgents = participantDepartments
		.map((department) => selectLeadAgent(session, department.departmentId))
		.filter((agent): agent is AgentDefinition => agent !== undefined);
	const supervisorAgent =
		session.runtimePlan.discussionPolicy.supervisorAgentId === undefined
			? undefined
			: session.runtimePlan.agentsById.get(session.runtimePlan.discussionPolicy.supervisorAgentId);
	const orderedAgents =
		session.runtimePlan.discussionPolicy.mode === DISCUSSION_MODE.SupervisorLed && supervisorAgent !== undefined
			? uniqueValues([supervisorAgent, ...departmentLeadAgents])
			: departmentLeadAgents;

	switch (session.runtimePlan.discussionPolicy.mode) {
		case DISCUSSION_MODE.SupervisorLed:
			return executeSupervisorLedTurns(session, orderedAgents, supervisorAgent, topic, ownerDepartmentId);
		case DISCUSSION_MODE.SequentialHandoff:
			return executeSequentialHandoffTurns(session, orderedAgents, topic, ownerDepartmentId);
		case DISCUSSION_MODE.ParallelReview:
			return executeParallelReviewTurns(session, orderedAgents, topic, ownerDepartmentId);
		default:
			return executeSequentialHandoffTurns(session, orderedAgents, topic, ownerDepartmentId);
	}
};


const createDiscussionArtifacts = async (session: RuntimeSession): Promise<DiscussionResult> => {
	const participantDepartments = createParticipantDepartments(session);
	const ownerResolution = resolveOwnerDepartment(session, participantDepartments);
	const topicId = toTopicId(createRuntimeScopedId('topic'));
	const topic: Topic = {
		topicId,
		goal: session.state.context.task.goal,
		constraints: session.state.context.task.constraints,
		participantDepartmentIds: participantDepartments.map((department) => department.departmentId),
		expectedOutputs: session.runtimePlan.discussionPolicy.requiredOutputs,
	};
	const subtopics: readonly Subtopic[] = participantDepartments.slice(1).map((department) => ({
		subtopicId: createRuntimeScopedId('subtopic'),
		topicId,
		title: `${department.name} subtopic`,
		goal: `${department.name} resolves its scoped work for ${session.state.context.task.title}.`,
		constraints: session.state.context.task.constraints,
		participantDepartmentIds: [department.departmentId],
		expectedOutputs: session.runtimePlan.discussionPolicy.requiredOutputs,
	}));

	if (ownerResolution.ownerDepartment === undefined) {
		return {
			topic,
			subtopics,
			decisions: [],
			ticketDrafts: [],
			turns: await createDiscussionTurnsAsync(session, participantDepartments, topic, undefined),
			conflicts: ownerResolution.conflicts,
			pendingItems: ownerResolution.pendingItems,
			recommendedArbiterAgentId: session.runtimePlan.discussionPolicy.supervisorAgentId,
			maxRoundsReached: session.runtimePlan.discussionPolicy.maxRounds <= 1,
		};
	}

	const ownerAgent = selectLeadAgent(session, ownerResolution.ownerDepartment.departmentId);
	const decisionId = toDecisionId(createRuntimeScopedId('decision'));
	const decision: Decision = {
		decisionId,
		topicId,
		ownerDepartmentId: ownerResolution.ownerDepartment.departmentId,
		conclusion: `${ownerResolution.ownerDepartment.name} owns the execution path for this task.`,
		rationale: `The task aligns best with ${ownerResolution.ownerDepartment.name}'s mission and decision scope.`,
		sourceRefs: [createDocumentSourceRef(session.state.context.traceId, 'runtime task trace')],
		retrievedMemoryIds: [],
	};
	const ticketDrafts: readonly TicketDraft[] =
		ownerAgent === undefined
			? []
			: [
				{
					ticketDraftId: toTicketDraftId(createRuntimeScopedId('ticket_draft')),
					topicId,
					ownerAgentId: ownerAgent.agentId,
					title: session.state.context.task.title,
					goal: session.state.context.task.goal,
					inputContract: ownerAgent.inputContract,
					outputContract: ownerAgent.outputContract,
					acceptanceCriteria:
						session.state.context.task.constraints.length > 0
							? session.state.context.task.constraints
							: [`Deliver ${session.state.context.task.title} with verifiable output.`],
					failurePolicy: 'return_to_discussion',
					derivedFromDecisionIds: [decisionId],
					requiredCapabilities: uniqueValues([
						...ownerAgent.skillIds,
						...ownerAgent.mcpServerIds,
						...ownerAgent.toolIds,
					]),
				},
			];

	return {
		topic,
		subtopics,
		decisions: [decision],
		ticketDrafts,
		turns: await createDiscussionTurnsAsync(session, participantDepartments, topic, ownerResolution.ownerDepartment.departmentId),
		conflicts: [],
		pendingItems:
			ticketDrafts.length === 0
				? [
					{
						summary: 'No owner agent was available for the selected department.',
						blockingReason: 'Discussion produced an owner department without a runnable lead agent.',
						requiredOwnerDepartmentId: ownerResolution.ownerDepartment.departmentId,
					},
				]
				: [],
		recommendedArbiterAgentId: session.runtimePlan.discussionPolicy.supervisorAgentId,
		maxRoundsReached: false,
	};
};

type TicketAdmissionAccumulator = {
	tickets: Ticket[];
	reviewResults: ReviewResult[];
};

type TicketAdmissionOutcome =
	| { readonly status: 'interrupted'; readonly session: RuntimeSession }
	| { readonly status: 'completed'; readonly tickets: readonly Ticket[]; readonly reviewResults: readonly ReviewResult[] };

const admitAllTicketDrafts = (
	session: RuntimeSession,
	ticketDrafts: readonly TicketDraft[],
	accumulated: TicketAdmissionAccumulator,
): TicketAdmissionOutcome => {
	for (const ticketDraft of ticketDrafts) {
		const admission = admitTicketDraft(session, ticketDraft);
		accumulated.reviewResults.push(...admission.reviewResults);

		if (admission.interruption !== undefined) {
			const sessionWithReviews = updateRuntimeSession(session, {
				reviewResults: [...session.state.reviewResults, ...accumulated.reviewResults],
				latestReviewResult: accumulated.reviewResults.at(-1),
			});
			return { status: 'interrupted', session: applyInterruption(sessionWithReviews, admission.interruption) };
		}

		if (admission.ticket !== undefined) {
			accumulated.tickets.push(admission.ticket);
		}
	}

	return { status: 'completed', tickets: accumulated.tickets, reviewResults: accumulated.reviewResults };
};

export const executeDiscussionStage = async (session: RuntimeSession): Promise<ValidationResult<RuntimeSession>> => {
	const startedSession = updateRuntimeSession(
		session,
		{},
		{
			eventType: RUNTIME_EVENT_TYPE.DiscussionStarted,
			reason: `Started discussion in ${session.runtimePlan.discussionPolicy.mode} mode.`,
			metadata: {
				mode: session.runtimePlan.discussionPolicy.mode,
			},
		},
	);
	const discussionResult = await createDiscussionArtifacts(startedSession);

	const sessionAfterDiscussion = updateRuntimeSession(
		startedSession,
		{
			discussionResult,
			interruption: undefined,
			pendingTickets: [],
			activeTicket: undefined,
			activePipeline: undefined,
			nextAction:
				discussionResult.pendingItems.length > 0 || discussionResult.conflicts.length > 0
					? 'Discussion requires conflict resolution before ticket admission.'
					: 'Run ticket admission review for discussion outputs.',
			context: {
				currentMode: WORK_MODE.Discussion,
				currentAgentId: session.runtimePlan.discussionPolicy.supervisorAgentId,
			},
		},
		{
			eventType: RUNTIME_EVENT_TYPE.DiscussionCompleted,
			reason: `Completed discussion in ${session.runtimePlan.discussionPolicy.mode} mode.`,
			metadata: {
				mode: session.runtimePlan.discussionPolicy.mode,
				decisionCount: discussionResult.decisions.length,
				ticketDraftCount: discussionResult.ticketDrafts.length,
				conflictCount: discussionResult.conflicts.length,
			},
		},
	);

	const sessionAfterTurns = discussionResult.turns.reduce(
		(currentSession, turn) => updateRuntimeSession(
			currentSession,
			{},
			{
				eventType: RUNTIME_EVENT_TYPE.DiscussionTurnRecorded,
				reason: `Recorded discussion turn for agent ${turn.agentId}.`,
				metadata: {
					round: turn.round,
					agentId: turn.agentId,
					departmentId: turn.departmentId,
				},
			},
		),
		sessionAfterDiscussion,
	);

	const sessionAfterConflicts = discussionResult.conflicts.reduce(
		(currentSession, conflict) => updateRuntimeSession(
			currentSession,
			{},
			{
				eventType: RUNTIME_EVENT_TYPE.DiscussionConflictDetected,
				reason: `Detected discussion conflict: ${conflict.summary}.`,
				metadata: {
					kind: conflict.kind,
					summary: conflict.summary,
					ownerDepartmentIds: conflict.ownerDepartmentIds,
					relatedDecisionIds: conflict.relatedDecisionIds,
				},
			},
		),
		sessionAfterTurns,
	);

	if (discussionResult.pendingItems.length > 0 || discussionResult.conflicts.length > 0) {
		return { ok: true, value: sessionAfterConflicts };
	}

	const admissionResult = admitAllTicketDrafts(
		sessionAfterConflicts,
		discussionResult.ticketDrafts,
		{ tickets: [], reviewResults: [] },
	);

	if (admissionResult.status === 'interrupted') {
		return { ok: true, value: admissionResult.session };
	}

	const finalSession = updateRuntimeSession(
		sessionAfterConflicts,
		{
			pendingTickets: admissionResult.tickets,
			reviewResults: [...sessionAfterConflicts.state.reviewResults, ...admissionResult.reviewResults],
			latestReviewResult: admissionResult.reviewResults.at(-1),
			nextAction:
				admissionResult.tickets.length === 0
					? 'No ticket drafts passed admission review.'
					: `Promote ${admissionResult.tickets.length} admitted ticket(s) into pipeline execution.`,
		},
		{
			eventType: RUNTIME_EVENT_TYPE.ReviewTicketAdmissionCompleted,
			reason: `Completed ticket admission review for ${discussionResult.ticketDrafts.length} draft(s).`,
			metadata: {
				admittedTicketCount: admissionResult.tickets.length,
				reviewCount: admissionResult.reviewResults.length,
			},
		},
	);

	return promoteNextTicket(finalSession);
};