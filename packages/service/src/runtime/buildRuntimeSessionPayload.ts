import type { RuntimeSession } from '../domain/runtime';

const serializeRuntimePlan = (runtimeSession: RuntimeSession) => ({
	team: runtimeSession.runtimePlan.team,
	departments: [...runtimeSession.runtimePlan.departmentsById.values()],
	agents: [...runtimeSession.runtimePlan.agentsById.values()],
	discussionPolicy: runtimeSession.runtimePlan.discussionPolicy,
	pipelinePolicy: runtimeSession.runtimePlan.pipelinePolicy,
	memoryPolicy: runtimeSession.runtimePlan.memoryPolicy,
	reviewPolicy: runtimeSession.runtimePlan.reviewPolicy,
});

export const buildRuntimeSessionPayload = (runtimeSession: RuntimeSession) => ({
	sessionId: runtimeSession.sessionId,
	status: runtimeSession.status,
	createdAt: runtimeSession.createdAt,
	updatedAt: runtimeSession.updatedAt,
	runtimePlan: serializeRuntimePlan(runtimeSession),
	state: runtimeSession.state,
});