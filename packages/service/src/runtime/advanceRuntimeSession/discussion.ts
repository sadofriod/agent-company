import type { ValidationResult } from '../../domain/base';
import { DiscussionConflictKind } from '../../domain/discussion';
import type {
	Decision,
	DiscussionBlackboard,
	DiscussionBlackboardEntry,
	DiscussionConnectedTarget,
	DiscussionConflict,
	DiscussionResult,
	DiscussionTurn,
	PendingItem,
	Subtopic,
	TicketDraft,
	Topic,
} from '../../domain/discussion';
import { DISCUSSION_CONNECTED_TARGET_KIND } from '../../domain/discussion';
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

type DiscussionParticipants = {
	readonly departments: readonly Department[];
	readonly agents: readonly AgentDefinition[];
	readonly connectedTargets: readonly DiscussionConnectedTarget[];
};

const WORKFLOW_PIPELINE_EDGE_TYPE = 'pipeline-handoff';
const DISCUSSION_BLACKBOARD_TARGET_ID = 'discussion:blackboard';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const isPipelineLayoutEdge = (
	edge: NonNullable<RuntimeSession['runtimePlan']['team']['layout']>['edges'][number],
): boolean => {
	const mode = isRecord(edge.data) ? asString(edge.data.mode) : undefined;
	return edge.type === WORKFLOW_PIPELINE_EDGE_TYPE || mode === 'pipeline';
};

const resolveTurnSummary = (turn: DiscussionTurn): string => {
	const blackboardWrite = turn.structuredOutput.blackboardWrite;

	if (typeof blackboardWrite === 'string' && blackboardWrite.trim().length > 0) {
		return blackboardWrite.trim();
	}

	const recommendation = turn.structuredOutput.recommendation;

	if (typeof recommendation === 'string' && recommendation.trim().length > 0) {
		return recommendation.trim();
	}

	return `${turn.agentId} updated the discussion blackboard.`;
};

const createAgentConnectedTarget = (
	agent: AgentDefinition,
	label?: string,
	detail?: string,
): DiscussionConnectedTarget => ({
	targetId: `agent:${agent.agentId}`,
	kind: DISCUSSION_CONNECTED_TARGET_KIND.Agent,
	label: label ?? agent.metadata?.name ?? agent.agentId,
	detail: detail ?? `${agent.role} reads and writes the shared discussion blackboard.`,
	readableByAgentIds: [agent.agentId],
	writableByAgentIds: [agent.agentId],
	capabilityIds: uniqueValues([
		...agent.skillIds,
		...agent.mcpServerIds,
		...agent.toolIds,
	]),
	inputContract: agent.inputContract,
	outputContract: agent.outputContract,
});

const createDepartmentConnectedTarget = (
	department: Department,
): DiscussionConnectedTarget => ({
	targetId: `department:${department.departmentId}`,
	kind: DISCUSSION_CONNECTED_TARGET_KIND.Department,
	label: department.name,
	detail: `${department.mission} Decision scope: ${department.decisionScope.join(', ') || 'none'}.`,
	readableByAgentIds: [...department.agentIds],
	writableByAgentIds: [...department.agentIds],
	capabilityIds: uniqueValues([
		...department.decisionScope,
		...department.handoffContracts,
	]),
});

const resolvePipelineDescendantAgents = (
	session: RuntimeSession,
	layoutNodesById: ReadonlyMap<string, NonNullable<RuntimeSession['runtimePlan']['team']['layout']>['nodes'][number]>,
	pipelineRootId: string,
): readonly AgentDefinition[] => {
	const layout = session.runtimePlan.team.layout;

	if (layout === undefined) {
		return [];
	}

	const pipelineEdges = layout.edges.filter(isPipelineLayoutEdge);
	const visitedNodeIds = new Set<string>();
	const agents: AgentDefinition[] = [];
	const pendingNodeIds = [pipelineRootId];

	while (pendingNodeIds.length > 0) {
		const nodeId = pendingNodeIds.pop();

		if (nodeId === undefined || visitedNodeIds.has(nodeId)) {
			continue;
		}

		visitedNodeIds.add(nodeId);

		const layoutNode = layoutNodesById.get(nodeId);
		const workflowAgentId = layoutNode?.data?.workflowNodeType === 'agent'
			? layoutNode.data.workflowAgentId
			: undefined;

		if (workflowAgentId !== undefined) {
			const agent = session.runtimePlan.agentsById.get(workflowAgentId as AgentDefinition['agentId']);

			if (agent !== undefined) {
				agents.push(agent);
			}
		}

		for (const edge of pipelineEdges) {
			if (edge.source === nodeId && !visitedNodeIds.has(edge.target)) {
				pendingNodeIds.push(edge.target);
			}
		}
	}

	return uniqueValues(agents);
};

const createPipelineConnectedTarget = (
	pipelineNodeId: string,
	label: string,
	detail: string,
	agents: readonly AgentDefinition[],
): DiscussionConnectedTarget => ({
	targetId: `pipeline:${pipelineNodeId}`,
	kind: DISCUSSION_CONNECTED_TARGET_KIND.Pipeline,
	label,
	detail,
	readableByAgentIds: agents.map((agent) => agent.agentId),
	writableByAgentIds: agents.map((agent) => agent.agentId),
	capabilityIds: uniqueValues(agents.flatMap((agent) => [
		...agent.skillIds,
		...agent.mcpServerIds,
		...agent.toolIds,
	])),
	downstreamTargetIds: agents.map((agent) => `agent:${agent.agentId}`),
});

const createDiscussionUpstreamInputs = (
	session: RuntimeSession,
): DiscussionBlackboard['upstreamInputs'] => {
	const upstreamInputs: Array<DiscussionBlackboard['upstreamInputs'][number]> = [
		{
			inputId: createRuntimeScopedId('blackboard_input'),
			source: 'task',
			summary: `Title: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}. Constraints: ${session.state.context.task.constraints.join('; ') || 'none'}.`,
		},
	];

	if (session.state.interruption !== undefined) {
		upstreamInputs.push({
			inputId: createRuntimeScopedId('blackboard_input'),
			source: 'interruption',
			summary: `${session.state.interruption.kind}: ${session.state.interruption.message}`,
		});
	}

	const latestStepSummary = session.state.latestStepResult?.output.summary;

	if (typeof latestStepSummary === 'string' && latestStepSummary.trim().length > 0) {
		upstreamInputs.push({
			inputId: createRuntimeScopedId('blackboard_input'),
			source: 'latest_step_result',
			summary: latestStepSummary.trim(),
		});
	}

	const latestReviewIssues = session.state.latestReviewResult?.issues ?? [];

	if (latestReviewIssues.length > 0) {
		upstreamInputs.push({
			inputId: createRuntimeScopedId('blackboard_input'),
			source: 'latest_review',
			summary: latestReviewIssues.map((issue) => `${issue.field}: ${issue.message}`).join(' | '),
		});
	}

	const latestHandoff = session.state.generatedHandoffs.at(-1);

	if (latestHandoff !== undefined) {
		upstreamInputs.push({
			inputId: createRuntimeScopedId('blackboard_input'),
			source: 'handoff',
			summary: `${latestHandoff.inputContract} -> ${latestHandoff.outputContract}`,
		});
	}

	return upstreamInputs;
};

const createDiscussionBlackboard = (
	session: RuntimeSession,
	connectedTargets: readonly DiscussionConnectedTarget[],
): DiscussionBlackboard => ({
	upstreamInputs: createDiscussionUpstreamInputs(session),
	connectedTargets,
	entries: [],
	latestSummary: session.state.context.task.goal,
});

const appendDiscussionBlackboardEntry = (
	blackboard: DiscussionBlackboard,
	turn: DiscussionTurn,
): DiscussionBlackboard => {
	const entry: DiscussionBlackboardEntry = {
		entryId: createRuntimeScopedId('blackboard_entry'),
		round: turn.round,
		authorAgentId: turn.agentId,
		sourceTargetIds: blackboard.connectedTargets.map((target) => target.targetId),
		summary: resolveTurnSummary(turn),
	};

	return {
		...blackboard,
		entries: [...blackboard.entries, entry],
		latestSummary: entry.summary,
	};
};

const buildDiscussionBlackboardPrompt = (blackboard: DiscussionBlackboard): string => {
	const upstreamInputs = blackboard.upstreamInputs.length === 0
		? '- none'
		: blackboard.upstreamInputs.map((input) => `- ${input.source}: ${input.summary}`).join('\n');
	const connectedTargets = blackboard.connectedTargets.length === 0
		? '- none'
		: blackboard.connectedTargets.map((target) => `- ${target.kind}:${target.label} | detail=${target.detail} | capabilities=${target.capabilityIds.join(', ') || 'none'}`).join('\n');
	const entries = blackboard.entries.length === 0
		? '- none yet'
		: blackboard.entries.map((entry) => `- round ${entry.round} ${entry.authorAgentId}: ${entry.summary}`).join('\n');

	return [
		'Shared discussion blackboard (all connected targets can read/write through the discussion node):',
		'Upstream inputs:',
		upstreamInputs,
		'Connected targets:',
		connectedTargets,
		'Current blackboard entries:',
		entries,
	].join('\n');
};

const resolveDiscussionParticipants = (session: RuntimeSession): DiscussionParticipants => {
	const layout = session.runtimePlan.team.layout;

	if (layout === undefined) {
		const departments = createParticipantDepartments(session);
		const agents = departments
			.map((department) => selectLeadAgent(session, department.departmentId))
			.filter((agent): agent is AgentDefinition => agent !== undefined);

		return {
			departments,
			agents,
			connectedTargets: [
				...departments.map(createDepartmentConnectedTarget),
				...agents.map((agent) => createAgentConnectedTarget(agent)),
			],
		};
	}

	const layoutNodesById = new Map(layout.nodes.map((node) => [node.id, node]));
	const departments: Department[] = [];
	const agents: AgentDefinition[] = [];
	const connectedTargets: DiscussionConnectedTarget[] = [];

	const addDepartment = (department: Department | undefined): void => {
		if (department === undefined || departments.some((entry) => entry.departmentId === department.departmentId)) {
			return;
		}

		departments.push(department);
	};

	const addConnectedTarget = (target: DiscussionConnectedTarget): void => {
		if (connectedTargets.some((entry) => entry.targetId === target.targetId)) {
			return;
		}

		connectedTargets.push(target);
	};

	const addAgent = (agent: AgentDefinition | undefined): void => {
		if (agent === undefined || agents.some((entry) => entry.agentId === agent.agentId)) {
			return;
		}

		agents.push(agent);
		addDepartment(session.runtimePlan.departmentsById.get(agent.departmentId));
	};

	for (const edge of layout.edges) {
		const adjacentNodeId = edge.source === 'discussion'
			? edge.target
			: edge.target === 'discussion'
				? edge.source
				: undefined;

		if (adjacentNodeId === undefined || adjacentNodeId === 'discussion') {
			continue;
		}

		if (adjacentNodeId.startsWith('department:')) {
			addDepartment(
				session.runtimePlan.departmentsById.get(
					adjacentNodeId.replace('department:', '') as Department['departmentId'],
				),
			);
			addConnectedTarget(createDepartmentConnectedTarget(
				session.runtimePlan.departmentsById.get(
					adjacentNodeId.replace('department:', '') as Department['departmentId'],
				)!,
			));
			continue;
		}

		if (adjacentNodeId.startsWith('agent:')) {
			const agent = session.runtimePlan.agentsById.get(
				adjacentNodeId.replace('agent:', '') as AgentDefinition['agentId'],
			);
			addAgent(
				agent,
			);
			if (agent !== undefined) {
				addConnectedTarget(createAgentConnectedTarget(agent));
			}
			continue;
		}

		const layoutNode = layoutNodesById.get(adjacentNodeId);
		const workflowNodeType = layoutNode?.data?.workflowNodeType;

		if (workflowNodeType === 'agent' && layoutNode?.data?.workflowAgentId !== undefined) {
			const agent = session.runtimePlan.agentsById.get(
				layoutNode.data.workflowAgentId as AgentDefinition['agentId'],
			);
			addAgent(
				agent,
			);
			if (agent !== undefined) {
				addConnectedTarget(createAgentConnectedTarget(
					agent,
					layoutNode.data.workflowMetadata?.name ?? layoutNode.data.nodeName,
					layoutNode.data.workflowMetadata?.description ?? layoutNode.data.detail,
				));
			}
			continue;
		}

		if (adjacentNodeId === 'pipeline' || workflowNodeType === 'pipeline') {
			const pipelineAgents = resolvePipelineDescendantAgents(session, layoutNodesById, adjacentNodeId);

			for (const agent of pipelineAgents) {
				addAgent(agent);
			}

			addConnectedTarget(createPipelineConnectedTarget(
				adjacentNodeId,
				layoutNode?.data?.workflowMetadata?.name
					?? layoutNode?.data?.nodeName
					?? 'Pipeline',
				layoutNode?.data?.workflowMetadata?.description
					?? layoutNode?.data?.detail
					?? `Pipeline-connected capabilities: ${pipelineAgents.map((agent) => agent.agentId).join(', ') || 'none'}.`,
				pipelineAgents,
			));
		}
	}

	if (departments.length > 0) {
		for (const department of departments) {
			if (agents.some((agent) => agent.departmentId === department.departmentId)) {
				continue;
			}

			addAgent(selectLeadAgent(session, department.departmentId));
		}
	}

	if (departments.length === 0 && agents.length > 0) {
		for (const agent of agents) {
			addDepartment(session.runtimePlan.departmentsById.get(agent.departmentId));
		}
	}

	if (departments.length === 0 && agents.length === 0) {
		const fallbackDepartments = createParticipantDepartments(session);
		const fallbackAgents = fallbackDepartments
			.map((department) => selectLeadAgent(session, department.departmentId))
			.filter((agent): agent is AgentDefinition => agent !== undefined);

		return {
			departments: fallbackDepartments,
			agents: fallbackAgents,
			connectedTargets: [
				...fallbackDepartments.map(createDepartmentConnectedTarget),
				...fallbackAgents.map((agent) => createAgentConnectedTarget(agent)),
			],
		};
	}

	return { departments, agents, connectedTargets };
};

const selectOwnerExecutionAgent = (
	session: RuntimeSession,
	participantAgents: readonly AgentDefinition[],
	departmentId: Department['departmentId'],
): AgentDefinition | undefined => participantAgents.find((agent) => agent.departmentId === departmentId)
	?? selectLeadAgent(session, departmentId);

const resolveConnectedAgentId = (
	target: DiscussionConnectedTarget,
): AgentDefinition['agentId'] | undefined => {
	if (target.kind !== DISCUSSION_CONNECTED_TARGET_KIND.Agent) {
		return undefined;
	}

	if (!target.targetId.startsWith('agent:')) {
		return undefined;
	}

	return target.targetId.replace('agent:', '') as AgentDefinition['agentId'];
};

const resolveLatestRecommendation = (
	turns: readonly DiscussionTurn[],
	agentId: AgentDefinition['agentId'],
): string | undefined => {
	for (let index = turns.length - 1; index >= 0; index -= 1) {
		const turn = turns[index];

		if (turn?.agentId !== agentId) {
			continue;
		}

		const recommendation = turn.structuredOutput.recommendation;

		if (typeof recommendation === 'string' && recommendation.trim().length > 0) {
			return recommendation.trim();
		}
	}

	return undefined;
};

const resolveExplicitDiscussionOwnerAgents = (
	session: RuntimeSession,
	connectedTargets: readonly DiscussionConnectedTarget[],
): readonly AgentDefinition[] => {
	if (session.runtimePlan.team.layout === undefined) {
		return [];
	}

	const explicitAgents = connectedTargets
		.map(resolveConnectedAgentId)
		.map((agentId) => (agentId === undefined ? undefined : session.runtimePlan.agentsById.get(agentId)))
		.filter((agent): agent is AgentDefinition => agent !== undefined);

	if (explicitAgents.length < 2) {
		return [];
	}

	const agentsByDepartment = new Map<Department['departmentId'], AgentDefinition[]>();

	for (const agent of explicitAgents) {
		const departmentAgents = agentsByDepartment.get(agent.departmentId) ?? [];
		departmentAgents.push(agent);
		agentsByDepartment.set(agent.departmentId, departmentAgents);
	}

	if (agentsByDepartment.size < 2) {
		return [];
	}

	return [...agentsByDepartment.values()]
		.map((departmentAgents) => departmentAgents.find((agent) => /owner|lead|supervisor/i.test(agent.role)) ?? departmentAgents[0])
		.filter((agent): agent is AgentDefinition => agent !== undefined);
};

const createDepartmentScopedAcceptanceCriteria = (
	session: RuntimeSession,
	agent: AgentDefinition,
	department: Department | undefined,
): readonly string[] => {
	const baseCriteria = session.state.context.task.constraints.length > 0
		? session.state.context.task.constraints
		: [`Deliver ${session.state.context.task.title} with verifiable output.`];

	return uniqueValues([
		...baseCriteria,
		`Produce ${agent.outputContract} for ${department?.name ?? agent.departmentId}.`,
	]);
};

const createExplicitDiscussionArtifacts = (
	session: RuntimeSession,
	topicId: Topic['topicId'],
	ownerAgents: readonly AgentDefinition[],
	turns: readonly DiscussionTurn[],
): {
	readonly decisions: readonly Decision[];
	readonly ticketDrafts: readonly TicketDraft[];
} => {
	const sourceRef = createDocumentSourceRef(session.state.context.traceId, 'runtime task trace');
	const artifacts = ownerAgents.map((agent) => {
		const department = session.runtimePlan.departmentsById.get(agent.departmentId);
		const recommendation = resolveLatestRecommendation(turns, agent.agentId);
		const decisionId = toDecisionId(createRuntimeScopedId('decision'));

		return {
			decision: {
				decisionId,
				topicId,
				ownerDepartmentId: agent.departmentId,
				conclusion: `${department?.name ?? agent.departmentId} owns the ${agent.outputContract} workstream for this task.`,
				rationale: recommendation ?? `${agent.agentId} was explicitly connected to the shared discussion blackboard.`,
				sourceRefs: [sourceRef],
				retrievedMemoryIds: [],
			} satisfies Decision,
			ticketDraft: {
				ticketDraftId: toTicketDraftId(createRuntimeScopedId('ticket_draft')),
				topicId,
				ownerAgentId: agent.agentId,
				title: `[${department?.name ?? agent.departmentId}] ${session.state.context.task.title}`,
				goal: session.state.context.task.goal,
				inputContract: agent.inputContract,
				outputContract: agent.outputContract,
				acceptanceCriteria: createDepartmentScopedAcceptanceCriteria(session, agent, department),
				failurePolicy: 'return_to_discussion',
				derivedFromDecisionIds: [decisionId],
				requiredCapabilities: uniqueValues([
					...agent.skillIds,
					...agent.mcpServerIds,
					...agent.toolIds,
				]),
			} satisfies TicketDraft,
		};
	});

	return {
		decisions: artifacts.map((artifact) => artifact.decision),
		ticketDrafts: artifacts.map((artifact) => artifact.ticketDraft),
	};
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

type DiscussionTurnExecution = {
	readonly turns: readonly DiscussionTurn[];
	readonly blackboard: DiscussionBlackboard;
};

/** Call one agent for their discussion turn and return structured output. */
const callAgentTurn = async (
	session: RuntimeSession,
	agent: AgentDefinition,
	systemPrompt: string,
	userPrompt: string,
	round: number,
	ownerDepartmentId: string | undefined,
	mode: string,
	blackboard: DiscussionBlackboard,
): Promise<DiscussionTurn> => {
	const assembly = createAgentAssemblyFactory(session.runtimePlan).assemble(agent.agentId);
	const fallback = `${agent.role} contributed to discussion in ${mode} mode.`;
	const blackboardPrompt = buildDiscussionBlackboardPrompt(blackboard);
	const recommendation = await callAgentLlm({
		gateway: assembly.gateway,
		systemPrompt,
		userPrompt: `${userPrompt}\n\n${blackboardPrompt}\n\nWrite your update back to the shared discussion blackboard.`,
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
			blackboardWrite: recommendation,
			readTargetIds: blackboard.connectedTargets.map((target) => target.targetId),
			writeTargetIds: [DISCUSSION_BLACKBOARD_TARGET_ID],
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
	participantAgents: readonly AgentDefinition[],
	supervisorAgent: AgentDefinition | undefined,
	topic: Topic,
	ownerDepartmentId: string | undefined,
 	blackboard: DiscussionBlackboard,
): Promise<DiscussionTurnExecution> => {
	const mode = DISCUSSION_MODE.SupervisorLed;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;
	const deptLeads = participantAgents.filter((agent) => agent.agentId !== supervisorAgent?.agentId);
	const turns: DiscussionTurn[] = [];
	const maxRounds = session.runtimePlan.discussionPolicy.maxRounds;
	let priorSupervisorRecommendation = '';
	let nextBlackboard = blackboard;

	for (let round = 1; round <= maxRounds; round += 1) {
		const roundRecommendations: string[] = [];

		for (const agent of deptLeads) {
			const systemPrompt = `You are ${agent.role} in department ${agent.departmentId}. Provide your department's perspective on the task.`;
			const priorSummary = priorSupervisorRecommendation.length > 0
				? `\n\nPrevious supervisor synthesis:\n${priorSupervisorRecommendation}`
				: '';
			const userPrompt = `${taskCtx} Topic: ${topic.goal}. Constraints: ${topic.constraints.join('; ')}.${priorSummary}\n\nWhat is your department's recommendation for round ${round}?`;
			const turn = await callAgentTurn(session, agent, systemPrompt, userPrompt, round, ownerDepartmentId, mode, nextBlackboard);
			turns.push(turn);
			nextBlackboard = appendDiscussionBlackboardEntry(nextBlackboard, turn);
			roundRecommendations.push(`${turn.agentId}: ${String(turn.structuredOutput.recommendation)}`);
		}

		if (supervisorAgent === undefined) {
			priorSupervisorRecommendation = roundRecommendations.join('\n');
			continue;
		}

		const systemPrompt = `You are ${supervisorAgent.role}. Review all department inputs and produce the current supervisor decision.`;
		const priorSummary = priorSupervisorRecommendation.length > 0
			? `\n\nPrevious supervisor synthesis:\n${priorSupervisorRecommendation}`
			: '';
		const departmentInputs = roundRecommendations.length === 0
			? `No department inputs were collected in round ${round}. Decide directly from the task context.`
			: roundRecommendations.join('\n');
		const userPrompt = `${taskCtx}${priorSummary}\n\nRound ${round} department inputs:\n${departmentInputs}\n\nMake the supervisor decision for this round and state the next handoff.`;
		const supervisorTurn = await callAgentTurn(session, supervisorAgent, systemPrompt, userPrompt, round, ownerDepartmentId, mode, nextBlackboard);
		turns.push(supervisorTurn);
		nextBlackboard = appendDiscussionBlackboardEntry(nextBlackboard, supervisorTurn);
		priorSupervisorRecommendation = String(supervisorTurn.structuredOutput.recommendation ?? '');
	}

	return { turns, blackboard: nextBlackboard };
};

/**
 * sequential_handoff: Each agent gets the previous agent's recommendation as context.
 */
const executeSequentialHandoffTurns = async (
	session: RuntimeSession,
	orderedAgents: readonly AgentDefinition[],
	topic: Topic,
	ownerDepartmentId: string | undefined,
 	blackboard: DiscussionBlackboard,
): Promise<DiscussionTurnExecution> => {
	const mode = DISCUSSION_MODE.SequentialHandoff;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;
	const turns: DiscussionTurn[] = [];
	const maxRounds = session.runtimePlan.discussionPolicy.maxRounds;
	let previousRecommendation = '';
	let nextBlackboard = blackboard;

	for (let round = 1; round <= maxRounds; round += 1) {
		for (const agent of orderedAgents) {
			const systemPrompt = `You are ${agent.role}. Build upon the prior agent's analysis for this task.`;
			const handoffContext = previousRecommendation.length > 0
				? `\n\nPrevious agent's analysis:\n${previousRecommendation}`
				: '';
			const userPrompt = `${taskCtx} Topic: ${topic.goal}. Constraints: ${topic.constraints.join('; ')}.${handoffContext}\n\nProvide your recommendation for round ${round} and the next stage.`;
			const turn = await callAgentTurn(session, agent, systemPrompt, userPrompt, round, ownerDepartmentId, mode, nextBlackboard);
			turns.push(turn);
			nextBlackboard = appendDiscussionBlackboardEntry(nextBlackboard, turn);
			previousRecommendation = String(turn.structuredOutput.recommendation ?? '');
		}
	}

	return { turns, blackboard: nextBlackboard };
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
 	blackboard: DiscussionBlackboard,
): Promise<DiscussionTurnExecution> => {
	const mode = DISCUSSION_MODE.ParallelReview;
	const taskCtx = `Task: ${session.state.context.task.title}. Goal: ${session.state.context.task.goal}.`;
	const turns: DiscussionTurn[] = [];
	const maxRounds = session.runtimePlan.discussionPolicy.maxRounds;
	let priorRoundSummary = '';
	let nextBlackboard = blackboard;

	for (let round = 1; round <= maxRounds; round += 1) {
		const roundContext = priorRoundSummary.length > 0
			? `\n\nPrevious round synthesis:\n${priorRoundSummary}`
			: '';
		const roundTurns = await Promise.all(orderedAgents.map((agent) => {
			const systemPrompt = `You are ${agent.role}. Independently review this task and provide your recommendation.`;
			const userPrompt = `${taskCtx} Topic: ${topic.goal}. Constraints: ${topic.constraints.join('; ')}.${roundContext}\n\nWhat is your independent recommendation for round ${round}?`;
			return callAgentTurn(session, agent, systemPrompt, userPrompt, round, ownerDepartmentId, mode, nextBlackboard);
		}));

		turns.push(...roundTurns);
		for (const turn of roundTurns) {
			nextBlackboard = appendDiscussionBlackboardEntry(nextBlackboard, turn);
		}
		priorRoundSummary = roundTurns
			.map((turn) => `${turn.agentId}: ${String(turn.structuredOutput.recommendation)}`)
			.join('\n');
	}

	return { turns, blackboard: nextBlackboard };
};

const createDiscussionTurnsAsync = async (
	session: RuntimeSession,
	participantDepartments: readonly Department[],
	participantAgents: readonly AgentDefinition[],
	connectedTargets: readonly DiscussionConnectedTarget[],
	topic: Topic,
	ownerDepartmentId: Department['departmentId'] | undefined,
): Promise<DiscussionTurnExecution> => {
	const departmentLeadAgents = participantDepartments
		.map((department) => selectLeadAgent(session, department.departmentId))
		.filter((agent): agent is AgentDefinition => agent !== undefined);
	const discussionAgents = uniqueValues(participantAgents.length > 0 ? participantAgents : departmentLeadAgents);
	const supervisorAgent =
		session.runtimePlan.discussionPolicy.supervisorAgentId === undefined
			? undefined
			: session.runtimePlan.agentsById.get(session.runtimePlan.discussionPolicy.supervisorAgentId);
	const orderedAgents = discussionAgents.length > 0
		? discussionAgents
		: supervisorAgent === undefined
			? []
			: [supervisorAgent];
	const blackboard = createDiscussionBlackboard(session, connectedTargets);

	switch (session.runtimePlan.discussionPolicy.mode) {
		case DISCUSSION_MODE.SupervisorLed:
			return executeSupervisorLedTurns(session, orderedAgents, supervisorAgent, topic, ownerDepartmentId, blackboard);
		case DISCUSSION_MODE.SequentialHandoff:
			return executeSequentialHandoffTurns(session, orderedAgents, topic, ownerDepartmentId, blackboard);
		case DISCUSSION_MODE.ParallelReview:
			return executeParallelReviewTurns(session, orderedAgents, topic, ownerDepartmentId, blackboard);
		default:
			return executeSequentialHandoffTurns(session, orderedAgents, topic, ownerDepartmentId, blackboard);
	}
};


const createDiscussionArtifacts = async (session: RuntimeSession): Promise<DiscussionResult> => {
	const participants = resolveDiscussionParticipants(session);
	const participantDepartments = participants.departments;
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
	const explicitOwnerAgents = resolveExplicitDiscussionOwnerAgents(session, participants.connectedTargets);

	if (explicitOwnerAgents.length > 1) {
		const explicitTurnExecution = await createDiscussionTurnsAsync(
			session,
			participantDepartments,
			participants.agents,
			participants.connectedTargets,
			topic,
			undefined,
		);
		const explicitArtifacts = createExplicitDiscussionArtifacts(
			session,
			topicId,
			explicitOwnerAgents,
			explicitTurnExecution.turns,
		);

		return {
			topic,
			subtopics,
			decisions: explicitArtifacts.decisions,
			ticketDrafts: explicitArtifacts.ticketDrafts,
			turns: explicitTurnExecution.turns,
			connectedTargets: participants.connectedTargets,
			blackboard: explicitTurnExecution.blackboard,
			conflicts: [],
			pendingItems: [],
			recommendedArbiterAgentId: undefined,
			maxRoundsReached: false,
		};
	}

	const ownerResolution = resolveOwnerDepartment(session, participantDepartments);

	if (ownerResolution.ownerDepartment === undefined) {
		const unresolvedTurnExecution = await createDiscussionTurnsAsync(
			session,
			participantDepartments,
			participants.agents,
			participants.connectedTargets,
			topic,
			undefined,
		);

		return {
			topic,
			subtopics,
			decisions: [],
			ticketDrafts: [],
			turns: unresolvedTurnExecution.turns,
			connectedTargets: participants.connectedTargets,
			blackboard: unresolvedTurnExecution.blackboard,
			conflicts: ownerResolution.conflicts,
			pendingItems: ownerResolution.pendingItems,
			recommendedArbiterAgentId: session.runtimePlan.discussionPolicy.supervisorAgentId,
			maxRoundsReached: session.runtimePlan.discussionPolicy.maxRounds > 0,
		};
	}

	const ownerAgent = selectOwnerExecutionAgent(
		session,
		participants.agents,
		ownerResolution.ownerDepartment.departmentId,
	);
	const turnExecution = await createDiscussionTurnsAsync(
		session,
		participantDepartments,
		participants.agents,
		participants.connectedTargets,
		topic,
		ownerResolution.ownerDepartment.departmentId,
	);
	const turns = turnExecution.turns;
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
		turns,
			connectedTargets: participants.connectedTargets,
			blackboard: turnExecution.blackboard,
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
					...(typeof turn.structuredOutput.recommendation === 'string'
						? { recommendation: turn.structuredOutput.recommendation }
						: {}),
					...(typeof turn.structuredOutput.blackboardWrite === 'string'
						? {
							blackboardWrite: turn.structuredOutput.blackboardWrite,
							summary: turn.structuredOutput.blackboardWrite,
						}
						: {}),
					...(Array.isArray(turn.structuredOutput.readTargetIds)
						? { readTargetIds: turn.structuredOutput.readTargetIds }
						: {}),
					...(Array.isArray(turn.structuredOutput.writeTargetIds)
						? { writeTargetIds: turn.structuredOutput.writeTargetIds }
						: {}),
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