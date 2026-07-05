import type { RuntimeEvent } from '../domain/runtimeEvent';

const resolveStepId = (event: RuntimeEvent): string | undefined => {
	const value = event.payload.stepId;

	return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const resolveErrorCode = (event: RuntimeEvent): string | undefined => {
	const value = event.payload.errorCode;

	return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const resolveSpanName = (eventType: string): string => {
	if (eventType.startsWith('discussion.')) {
		return 'discussion.execute';
	}

	if (eventType === 'review.ticket_admission_completed') {
		return 'ticket.admission.review';
	}

	if (eventType.startsWith('review.')) {
		return 'review.gate.run';
	}

	if (eventType === 'memory.retrieved' || eventType === 'memory.conflict_detected') {
		return 'memory.retrieve';
	}

	if (eventType === 'capability.loaded' || eventType === 'capability.denied') {
		return 'capability.load';
	}

	if (eventType.startsWith('pipeline.step_')) {
		return 'pipeline.step.execute';
	}

	if (eventType.startsWith('pipeline.')) {
		return 'agent.step.runner';
	}

	return 'runtime.advance';
};

export const logRuntimeEvent = (event: RuntimeEvent): void => {
	const logEntry = {
		traceId: event.traceId,
		sessionId: event.sessionId,
		eventId: event.eventId,
		eventType: event.eventType,
		sequence: event.sequence,
		level: event.level,
		ts: event.ts,
		agentId: event.actor?.agentId,
		departmentId: event.actor?.departmentId,
		reviewer: event.actor?.reviewer,
		stepId: resolveStepId(event),
		latencyMs: event.metrics?.latencyMs,
		errorCode: resolveErrorCode(event),
		spanName: resolveSpanName(event.eventType),
	};

	console.log(JSON.stringify(logEntry));
};
