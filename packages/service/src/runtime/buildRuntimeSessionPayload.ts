import type {
	RuntimePlan,
	RuntimeSession,
	RuntimeState,
	RuntimeTask,
} from '../domain/runtime';
import type {
	AgentDefinition,
	Department,
	DiscussionPolicy,
	MemoryPolicy,
	TeamDefinition,
} from '../domain/organization';

import { toRuntimeId } from './runtimeEngineShared';
import { createRuntimePlan } from './createRuntimePlan';

export type SerializedRuntimePlan = {
	readonly team: TeamDefinition;
	readonly departments: readonly Department[];
	readonly agents: readonly AgentDefinition[];
	readonly discussionPolicy: DiscussionPolicy;
	readonly memoryPolicy?: MemoryPolicy;
};

export type RuntimeSessionPayload = {
	readonly sessionId: string;
	readonly status: RuntimeSession['status'];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly runtimePlan: SerializedRuntimePlan;
	readonly state: RuntimeState & {
		readonly context?: RuntimeState['context'] & {
			readonly task?: RuntimeTask;
			readonly traceId?: string;
			readonly teamId?: string;
			readonly currentMode?: RuntimeState['context']['currentMode'];
			readonly auditTrail?: RuntimeState['context']['auditTrail'];
			readonly memoryScopes?: RuntimeState['context']['memoryScopes'];
		};
	};
};

export type RuntimeSessionListItemPayload = {
	readonly sessionId: string;
	readonly status: RuntimeSession['status'];
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly task?: {
		readonly title: RuntimeTask['title'];
		readonly goal: RuntimeTask['goal'];
	};
};

const serializeRuntimePlan = (runtimeSession: RuntimeSession): SerializedRuntimePlan => ({
	team: runtimeSession.runtimePlan.team,
	departments: [...runtimeSession.runtimePlan.departmentsById.values()],
	agents: [...runtimeSession.runtimePlan.agentsById.values()],
	discussionPolicy: runtimeSession.runtimePlan.discussionPolicy,
	memoryPolicy: runtimeSession.runtimePlan.memoryPolicy,
});

export const buildRuntimeSessionPayload = (runtimeSession: RuntimeSession): RuntimeSessionPayload => ({
	sessionId: runtimeSession.sessionId,
	status: runtimeSession.status,
	createdAt: runtimeSession.createdAt,
	updatedAt: runtimeSession.updatedAt,
	runtimePlan: serializeRuntimePlan(runtimeSession),
	state: runtimeSession.state,
});

export const buildRuntimeSessionListItemPayload = (
	runtimeSession: RuntimeSession,
): RuntimeSessionListItemPayload => {
	const task = runtimeSession.state.context.task;

	return {
		sessionId: runtimeSession.sessionId,
		status: runtimeSession.status,
		createdAt: runtimeSession.createdAt,
		updatedAt: runtimeSession.updatedAt,
		...(task === undefined
			? {}
			: {
				task: {
					title: task.title,
					goal: task.goal,
				},
			}),
	};
};

const restoreRuntimePlan = (runtimePlan: SerializedRuntimePlan): RuntimePlan => {
	return createRuntimePlan(runtimePlan.team);
};

export const restoreRuntimeSessionPayload = (payload: RuntimeSessionPayload): RuntimeSession => ({
	sessionId: toRuntimeId(payload.sessionId),
	status: payload.status,
	createdAt: payload.createdAt,
	updatedAt: payload.updatedAt,
	runtimePlan: restoreRuntimePlan(payload.runtimePlan),
	state: payload.state,
});