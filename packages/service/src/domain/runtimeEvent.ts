export const RUNTIME_EVENT_LEVEL = {
	Info: 'info',
	Warn: 'warn',
	Error: 'error',
} as const;

export type RuntimeEventLevel =
	typeof RUNTIME_EVENT_LEVEL[keyof typeof RUNTIME_EVENT_LEVEL];

export const RUNTIME_EVENT_TYPE = {
	Snapshot: 'snapshot',
	SnapshotReset: 'snapshot_reset',
	Heartbeat: 'heartbeat',
	MetricsUpdated: 'metrics.updated',
	ObservabilityDegraded: 'observability.degraded',
	RuntimeSessionStarted: 'runtime.session_started',
	RuntimeSessionPaused: 'runtime.session_paused',
	RuntimeSessionResumed: 'runtime.session_resumed',
	RuntimeSessionAdvanced: 'runtime.session_advanced',
	RuntimeSessionCompleted: 'runtime.session_completed',
	RuntimeSessionTerminated: 'runtime.session_terminated',
	RuntimeWorkModeRouted: 'runtime.work_mode_routed',
	RuntimeInterrupted: 'runtime.interrupted',
	PipelineStepRunnerCompleted: 'pipeline.step_runner_completed',
	DiscussionStarted: 'discussion.started',
	DiscussionTurnRecorded: 'discussion.turn_recorded',
	DiscussionCompleted: 'discussion.completed',
	DiscussionConflictDetected: 'discussion.conflict_detected',
	ReviewTicketAdmissionCompleted: 'review.ticket_admission_completed',
	ReviewStepCompleted: 'review.step_completed',
	ReviewBlocked: 'review.blocked',
	ReviewReviseRequired: 'review.revise_required',
	PipelineCreated: 'pipeline.created',
	PipelineStepStarted: 'pipeline.step_started',
	PipelineStepCompleted: 'pipeline.step_completed',
	PipelineHandoffGenerated: 'pipeline.handoff_generated',
	PipelineCompleted: 'pipeline.completed',
	CapabilityLoaded: 'capability.loaded',
	CapabilityDenied: 'capability.denied',
	MemoryRetrieved: 'memory.retrieved',
	MemoryConflictDetected: 'memory.conflict_detected',
} as const;

export type RuntimeEventType =
	typeof RUNTIME_EVENT_TYPE[keyof typeof RUNTIME_EVENT_TYPE];

export type RuntimeEventActor = {
	readonly agentId?: string;
	readonly departmentId?: string;
	readonly reviewer?: string;
};

export type RuntimeEventTarget = {
	readonly type?: string;
	readonly id?: string;
};

export type RuntimeEventMetrics = {
	readonly latencyMs?: number;
	readonly tokensIn?: number;
	readonly tokensOut?: number;
	readonly costUsd?: number;
};

export type RuntimeEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
	readonly eventId: string;
	readonly traceId: string;
	readonly sessionId: string;
	readonly sequence: number;
	readonly eventType: string;
	readonly ts: string;
	readonly level: RuntimeEventLevel;
	readonly actor?: RuntimeEventActor;
	readonly target?: RuntimeEventTarget;
	readonly statePatch?: Readonly<Record<string, unknown>>;
	readonly metrics?: RuntimeEventMetrics;
	readonly payload: TPayload;
};

export type RuntimeMetricsPayload = {
	readonly runtimeSessionActive: Readonly<Record<string, number>>;
	readonly runtimeAdvanceTotal: Readonly<Record<string, number>>;
	readonly runtimeEventTotal: Readonly<Record<string, number>>;
	readonly pipelineStepDurationMs: Readonly<
		Record<
			string,
			{
				readonly count: number;
				readonly totalMs: number;
				readonly maxMs: number;
				readonly minMs: number;
			}
		>
	>;
	readonly pipelineInterruptTotal: Readonly<Record<string, number>>;
	readonly reviewResultTotal: Readonly<Record<string, number>>;
	readonly memoryRetrievalTotal: Readonly<Record<string, number>>;
	readonly agentToolCallTotal: Readonly<Record<string, number>>;
	readonly updatedAt: string;
};

export const isReviewRuntimeEvent = (event: RuntimeEvent): boolean =>
	event.eventType.startsWith('review.');

export const isInterruptionRuntimeEvent = (event: RuntimeEvent): boolean =>
	event.eventType === RUNTIME_EVENT_TYPE.RuntimeInterrupted
	|| event.eventType === RUNTIME_EVENT_TYPE.RuntimeSessionPaused
	|| event.eventType === RUNTIME_EVENT_TYPE.RuntimeSessionResumed;
