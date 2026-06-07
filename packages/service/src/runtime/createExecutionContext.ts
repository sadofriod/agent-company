import type { AuditEvent } from '../domain/runtime';
import { WORK_MODE, type RuntimePlan, type RuntimeState, type RuntimeTask } from '../domain/runtime';

import { uniqueMemoryScopes } from './runtimeEngineShared';

type CreateExecutionContextInput = {
	readonly runtimeId: RuntimeState['context']['runtimeId'];
	readonly runtimePlan: RuntimePlan;
	readonly task: RuntimeTask;
	readonly traceId: string;
	readonly auditTrail: readonly AuditEvent[];
};

export const createExecutionContext = (input: CreateExecutionContextInput): RuntimeState => ({
	context: {
		runtimeId: input.runtimeId,
		task: input.task,
		traceId: input.traceId,
		teamId: input.runtimePlan.team.teamId,
		currentMode: WORK_MODE.Discussion,
		auditTrail: input.auditTrail,
		memoryScopes: uniqueMemoryScopes(input.runtimePlan.team),
	},
	workModeDecision: {
		mode: WORK_MODE.Discussion,
		reason: 'New runtime sessions begin in discussion mode until runtime routing promotes a ticket into pipeline execution.',
		requiredObjects: ['topic', 'decision', 'ticket_draft'],
	},
	pendingTickets: [],
	completedTickets: [],
	completedStepResults: [],
	reviewResults: [],
	generatedHandoffs: [],
	nextAction: 'Run discussion to produce decisions and ticket drafts.',
});