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

const createDiscussionTurns = (
	session: RuntimeSession,
	participantDepartments: readonly Department[],
	topic: Topic,
	ownerDepartmentId: Department['departmentId'] | undefined,
): readonly DiscussionTurn[] => {
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
	const sharedPrompt = `Task goal: ${session.state.context.task.goal}. Topic: ${topic.goal}.`;

	if (session.runtimePlan.discussionPolicy.mode === DISCUSSION_MODE.ParallelReview) {
		return orderedAgents.map((agent) => ({
			round: 1,
			agentId: agent.agentId,
			departmentId: agent.departmentId,
			promptSummary: sharedPrompt,
			structuredOutput: {
				recommendation: `${agent.role} reviewed the task for ${agent.departmentId}.`,
				ownerDepartmentId,
				mode: session.runtimePlan.discussionPolicy.mode,
			},
			evidenceRefs: [
				createEvidenceRef(
					createDocumentSourceRef(session.state.context.traceId, 'runtime task trace'),
					session.state.context.task.goal,
				),
			],
		}));
	}

	return orderedAgents.map((agent, index) => ({
		round: index + 1,
		agentId: agent.agentId,
		departmentId: agent.departmentId,
		promptSummary: sharedPrompt,
		structuredOutput: {
			recommendation: `${agent.role} advanced the discussion in ${session.runtimePlan.discussionPolicy.mode} mode.`,
			ownerDepartmentId,
			mode: session.runtimePlan.discussionPolicy.mode,
			sequence: index + 1,
		},
		evidenceRefs: [
			createEvidenceRef(
				createDocumentSourceRef(session.state.context.traceId, 'runtime task trace'),
				session.state.context.task.goal,
			),
		],
	}));
};

const createDiscussionArtifacts = (session: RuntimeSession): DiscussionResult => {
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
			turns: createDiscussionTurns(session, participantDepartments, topic, undefined),
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
		turns: createDiscussionTurns(session, participantDepartments, topic, ownerResolution.ownerDepartment.departmentId),
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

export const executeDiscussionStage = (session: RuntimeSession): ValidationResult<RuntimeSession> => {
	const discussionResult = createDiscussionArtifacts(session);
	let nextSession = updateRuntimeSession(
		session,
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
			eventType: 'discussion.completed',
			reason: `Completed discussion in ${session.runtimePlan.discussionPolicy.mode} mode.`,
			metadata: {
				mode: session.runtimePlan.discussionPolicy.mode,
				decisionCount: discussionResult.decisions.length,
				ticketDraftCount: discussionResult.ticketDrafts.length,
				conflictCount: discussionResult.conflicts.length,
			},
		},
	);

	for (const turn of discussionResult.turns) {
		nextSession = updateRuntimeSession(
			nextSession,
			{},
			{
				eventType: 'discussion.turn_recorded',
				reason: `Recorded discussion turn for agent ${turn.agentId}.`,
				metadata: {
					round: turn.round,
					agentId: turn.agentId,
					departmentId: turn.departmentId,
				},
			},
		);
	}

	if (discussionResult.pendingItems.length > 0 || discussionResult.conflicts.length > 0) {
		return { ok: true, value: nextSession };
	}

	const admittedTickets: Ticket[] = [];
	const reviewResults: ReviewResult[] = [];

	for (const ticketDraft of discussionResult.ticketDrafts) {
		const admission = admitTicketDraft(nextSession, ticketDraft);

		reviewResults.push(...admission.reviewResults);

		if (admission.interruption !== undefined) {
			return {
				ok: true,
				value: applyInterruption(
					updateRuntimeSession(nextSession, {
						reviewResults: [...nextSession.state.reviewResults, ...reviewResults],
						latestReviewResult: reviewResults.at(-1),
					}),
					admission.interruption,
				),
			};
		}

		if (admission.ticket !== undefined) {
			admittedTickets.push(admission.ticket);
		}
	}

	nextSession = updateRuntimeSession(
		nextSession,
		{
			pendingTickets: admittedTickets,
			reviewResults: [...nextSession.state.reviewResults, ...reviewResults],
			latestReviewResult: reviewResults.at(-1),
			nextAction:
				admittedTickets.length === 0
					? 'No ticket drafts passed admission review.'
					: `Promote ${admittedTickets.length} admitted ticket(s) into pipeline execution.`,
		},
		{
			eventType: 'review.ticket_admission_completed',
			reason: `Completed ticket admission review for ${discussionResult.ticketDrafts.length} draft(s).`,
			metadata: {
				admittedTicketCount: admittedTickets.length,
				reviewCount: reviewResults.length,
			},
		},
	);

	return promoteNextTicket(nextSession);
};