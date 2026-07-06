import type { EvidenceRef, SchemaIssue, SourceRef } from '../../domain/base';
import { PipelineInterruptionKind } from '../../domain/delivery';
import type {
	Pipeline,
	PipelineInterruption,
	PipelineStep,
} from '../../domain/delivery';
import {
	WORK_MODE,
	type ExecutionContext,
	type RuntimeSession,
	type RuntimeState,
} from '../../domain/runtime';

import {
	createAuditEvent,
	createIssue,
	createTimestamp,
} from '../runtimeEngineShared';
import { RUNTIME_EVENT_TYPE } from '../../domain/runtimeEvent';

export type RuntimeStatePatch = Partial<Omit<RuntimeState, 'context'>> & {
	readonly context?: Partial<ExecutionContext>;
};

export const SESSION_COMPLETE_MESSAGE = 'Runtime execution completed. No further tickets remain.';

export const tokenize = (value: string): readonly string[] =>
	value
		.toLowerCase()
		.split(/[^a-z0-9\u4e00-\u9fa5]+/)
		.filter((token) => token.length > 0);

export const uniqueValues = <TValue>(values: readonly TValue[]): readonly TValue[] => [...new Set(values)];

export const createEvidenceRef = (source: SourceRef, excerpt?: string): EvidenceRef => ({
	source,
	...(excerpt === undefined ? {} : { excerpt }),
});

export const updateRuntimeSession = (
	session: RuntimeSession,
	patch: RuntimeStatePatch,
	options: {
		readonly eventType?: string;
		readonly reason?: string;
		readonly metadata?: Readonly<Record<string, unknown>>;
	} = {},
): RuntimeSession => {
	const timestamp = createTimestamp();
	const auditEvent =
		options.eventType === undefined || options.reason === undefined
			? undefined
			: createAuditEvent(session.sessionId, options.eventType, options.reason, timestamp, options.metadata);
	const nextAuditTrail =
		auditEvent === undefined
			? session.state.context.auditTrail
			: [...session.state.context.auditTrail, auditEvent];
	const nextContext: ExecutionContext = {
		...session.state.context,
		...(patch.context ?? {}),
		auditTrail: nextAuditTrail,
	};

	return {
		...session,
		updatedAt: timestamp,
		state: {
			...session.state,
			...patch,
			context: nextContext,
		},
	};
};

export const createNotRunningIssues = (status: RuntimeSession['status']): readonly SchemaIssue[] => [
	createIssue(
		'runtime_session_not_running',
		['status'],
		`Runtime session must be running before it can advance. Current status: '${status}'.`,
		'Resume the session before advancing it.',
	),
];

export const createPipelineInterruption = (
	kind: PipelineInterruption['kind'],
	message: string,
	suggestedAction: string,
	pipelineId?: Pipeline['pipelineId'],
	stepId?: PipelineStep['stepId'],
): PipelineInterruption => ({
	kind,
	message,
	suggestedAction,
	...(pipelineId === undefined ? {} : { pipelineId }),
	...(stepId === undefined ? {} : { stepId }),
});

export const applyInterruption = (
	session: RuntimeSession,
	interruption: PipelineInterruption,
): RuntimeSession => {
	const shouldReturnToDiscussion =
			interruption.kind === PipelineInterruptionKind.ReturnToDiscussion || interruption.kind === PipelineInterruptionKind.TicketAdmissionFailed;

	return updateRuntimeSession(
		session,
		{
			interruption,
			activePipeline: shouldReturnToDiscussion ? undefined : session.state.activePipeline,
			activeTicket: shouldReturnToDiscussion ? undefined : session.state.activeTicket,
			nextAction: interruption.suggestedAction,
			context: {
				currentMode: shouldReturnToDiscussion ? WORK_MODE.Discussion : WORK_MODE.Pipeline,
			},
		},
		{
			eventType: RUNTIME_EVENT_TYPE.RuntimeInterrupted,
			reason: interruption.message,
			metadata: {
				kind: interruption.kind,
				suggestedAction: interruption.suggestedAction,
				...(interruption.pipelineId === undefined ? {} : { pipelineId: interruption.pipelineId }),
				...(interruption.stepId === undefined ? {} : { stepId: interruption.stepId }),
			},
		},
	);
};