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
	PipelinePolicy,
	TeamDefinition,
} from '../domain/organization';
import type { ReviewPolicy } from '../domain/review';

import { toRuntimeId } from './runtimeEngineShared';
import { createRuntimePlan } from './createRuntimePlan';

export type SerializedRuntimePlan = {
	readonly team: TeamDefinition;
	readonly departments: readonly Department[];
	readonly agents: readonly AgentDefinition[];
	readonly discussionPolicy: DiscussionPolicy;
	readonly pipelinePolicy: PipelinePolicy;
	readonly memoryPolicy?: MemoryPolicy;
	readonly reviewPolicy: ReviewPolicy;
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

const serializeRuntimePlan = (runtimeSession: RuntimeSession): SerializedRuntimePlan => ({
	team: runtimeSession.runtimePlan.team,
	departments: [...runtimeSession.runtimePlan.departmentsById.values()],
	agents: [...runtimeSession.runtimePlan.agentsById.values()],
	discussionPolicy: runtimeSession.runtimePlan.discussionPolicy,
	pipelinePolicy: runtimeSession.runtimePlan.pipelinePolicy,
	memoryPolicy: runtimeSession.runtimePlan.memoryPolicy,
	reviewPolicy: runtimeSession.runtimePlan.reviewPolicy,
});

export const buildRuntimeSessionPayload = (runtimeSession: RuntimeSession): RuntimeSessionPayload => ({
	sessionId: runtimeSession.sessionId,
	status: runtimeSession.status,
	createdAt: runtimeSession.createdAt,
	updatedAt: runtimeSession.updatedAt,
	runtimePlan: serializeRuntimePlan(runtimeSession),
	state: runtimeSession.state,
});

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