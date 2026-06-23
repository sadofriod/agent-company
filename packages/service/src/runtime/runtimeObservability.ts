import type { ValidationResult } from '../domain/base';
import type { AuditEvent, RuntimeSession } from '../domain/runtime';
import {
	RUNTIME_EVENT_LEVEL,
	RUNTIME_EVENT_TYPE,
	type RuntimeEvent,
	type RuntimeEventActor,
	type RuntimeEventMetrics,
	type RuntimeEventTarget,
	type RuntimeMetricsPayload,
} from '../domain/runtimeEvent';
import type { RuntimeObservabilityRepository } from '../adapter/runtimeObservabilityRepository';

import { buildRuntimeSessionPayload } from './buildRuntimeSessionPayload';
import { createIssue, createTimestamp } from './runtimeEngineShared';
import { logRuntimeEvent } from './runtimeStructuredLogger';

type RuntimeEventFilter = (event: RuntimeEvent) => boolean;
type RuntimeEventListener = (event: RuntimeEvent) => void;
type Unsubscribe = () => void;

type RuntimeEventReplay = {
	readonly resetEvent?: RuntimeEvent;
	readonly events: readonly RuntimeEvent[];
};

type SessionSubscriber = {
	readonly filter: RuntimeEventFilter;
	readonly listener: RuntimeEventListener;
};

type MetricsSubscriber = {
	readonly listener: RuntimeEventListener;
};

type DurationMetric = {
	count: number;
	totalMs: number;
	maxMs: number;
	minMs: number;
};

type MetricsCounters = {
	runtimeAdvanceTotal: Record<string, number>;
	runtimeEventTotal: Record<string, number>;
	pipelineStepDurationMs: Record<string, DurationMetric>;
	pipelineInterruptTotal: Record<string, number>;
	reviewResultTotal: Record<string, number>;
	memoryRetrievalTotal: Record<string, number>;
	agentToolCallTotal: Record<string, number>;
};

export type RuntimeSessionObservability = {
	readonly getSnapshotEvent: (sessionId: string) => Promise<ValidationResult<RuntimeEvent>>;
	readonly getSessionEvents: (
		sessionId: string,
		options?: {
			readonly lastEventId?: string;
			readonly filter?: RuntimeEventFilter;
		},
	) => Promise<ValidationResult<RuntimeEventReplay>>;
	readonly subscribeToSession: (
		sessionId: string,
		listener: RuntimeEventListener,
		options?: {
			readonly filter?: RuntimeEventFilter;
		},
	) => Promise<ValidationResult<Unsubscribe>>;
	readonly getMetricsEvents: (lastEventId?: string) => Promise<RuntimeEventReplay>;
	readonly subscribeToMetrics: (listener: RuntimeEventListener) => Promise<Unsubscribe>;
};

const SNAPSHOT_EVENT_ID_PREFIX = 'snapshot:';
const SNAPSHOT_RESET_EVENT_ID_PREFIX = 'snapshot_reset:';
const METRICS_EVENT_ID_PREFIX = 'metrics:';
const METRICS_RESET_EVENT_ID_PREFIX = 'metrics_reset:';

const allowAllEvents: RuntimeEventFilter = () => true;

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const toRecord = (value: unknown): Record<string, unknown> =>
	typeof value === 'object' && value !== null ? { ...(value as Record<string, unknown>) } : {};

const createMissingSession = <TValue>(sessionId: string): ValidationResult<TValue> => ({
	ok: false,
	issues: [
		createIssue(
			'runtime_session_missing',
			['sessionId'],
			`Runtime session '${sessionId}' was not found.`,
			'Start a new session before subscribing to readonly streams.',
		),
	],
});

const getSessionKey = (sessionId: string): string => sessionId;

const createMetricsCounters = (): MetricsCounters => ({
	runtimeAdvanceTotal: {},
	runtimeEventTotal: {},
	pipelineStepDurationMs: {},
	pipelineInterruptTotal: {},
	reviewResultTotal: {},
	memoryRetrievalTotal: {},
	agentToolCallTotal: {},
});

const incrementCount = (target: Record<string, number>, key: string): void => {
	target[key] = (target[key] ?? 0) + 1;
};

const updateDurationMetric = (
	target: Record<string, DurationMetric>,
	key: string,
	latencyMs: number,
): void => {
	const current = target[key];

	if (current === undefined) {
		target[key] = {
			count: 1,
			totalMs: latencyMs,
			maxMs: latencyMs,
			minMs: latencyMs,
		};
		return;
	}

	current.count += 1;
	current.totalMs += latencyMs;
	current.maxMs = Math.max(current.maxMs, latencyMs);
	current.minMs = Math.min(current.minMs, latencyMs);
};

const updateMetricsCounters = (counters: MetricsCounters, event: RuntimeEvent): void => {
	incrementCount(counters.runtimeEventTotal, event.eventType);

	if (event.eventType === RUNTIME_EVENT_TYPE.RuntimeSessionAdvanced) {
		incrementCount(counters.runtimeAdvanceTotal, 'success');
	}

	const payload = toRecord(event.payload);

	if (event.eventType === RUNTIME_EVENT_TYPE.RuntimeInterrupted && isString(payload.kind)) {
		incrementCount(counters.pipelineInterruptTotal, payload.kind);
	}

	if (event.eventType.startsWith('review.') && isString(payload.status) && isString(payload.reviewer)) {
		incrementCount(counters.reviewResultTotal, `${payload.status}:${payload.reviewer}`);
	}

	if (event.eventType === RUNTIME_EVENT_TYPE.MemoryRetrieved && isString(payload.profileId)) {
		incrementCount(counters.memoryRetrievalTotal, `${payload.profileId}:success`);
	}

	if (event.eventType === RUNTIME_EVENT_TYPE.MemoryConflictDetected && isString(payload.profileId)) {
		incrementCount(counters.memoryRetrievalTotal, `${payload.profileId}:conflict`);
	}

	if (event.eventType === RUNTIME_EVENT_TYPE.PipelineStepRunnerCompleted && isNumber(event.metrics?.latencyMs)) {
		const agentId = isString(payload.agentId) ? payload.agentId : 'unknown';
		updateDurationMetric(counters.pipelineStepDurationMs, agentId, event.metrics.latencyMs);
	}

	const toolCalls = payload.toolCalls;

	if (!Array.isArray(toolCalls)) {
		return;
	}

	for (const toolCall of toolCalls) {
		const entry = toRecord(toolCall);

		if (!isString(entry.capabilityId) || !isString(entry.status)) {
			continue;
		}

		incrementCount(counters.agentToolCallTotal, `${entry.capabilityId}:${entry.status}`);
	}
};

const resolveActor = (metadata: Readonly<Record<string, unknown>>): RuntimeEventActor | undefined => {
	const actor: RuntimeEventActor = {
		...(isString(metadata.agentId) ? { agentId: metadata.agentId } : {}),
		...(isString(metadata.departmentId) ? { departmentId: metadata.departmentId } : {}),
		...(isString(metadata.reviewer) ? { reviewer: metadata.reviewer } : {}),
	};

	return Object.keys(actor).length > 0 ? actor : undefined;
};

const resolveTarget = (
	sessionId: string,
	eventType: string,
	metadata: Readonly<Record<string, unknown>>,
): RuntimeEventTarget | undefined => {
	if (isString(metadata.stepId)) {
		return { type: 'pipeline_step', id: metadata.stepId };
	}

	if (isString(metadata.handoffId)) {
		return { type: 'handoff', id: metadata.handoffId };
	}

	if (isString(metadata.ticketId)) {
		return { type: 'ticket', id: metadata.ticketId };
	}

	if (isString(metadata.pipelineId)) {
		return { type: 'pipeline', id: metadata.pipelineId };
	}

	if (isString(metadata.reviewId)) {
		return { type: 'review_result', id: metadata.reviewId };
	}

	if (eventType.startsWith('runtime.')) {
		return { type: 'runtime_session', id: sessionId };
	}

	return undefined;
};

const resolveMetrics = (metadata: Readonly<Record<string, unknown>>): RuntimeEventMetrics | undefined => {
	const metrics: RuntimeEventMetrics = {
		...(isNumber(metadata.latencyMs) ? { latencyMs: metadata.latencyMs } : {}),
		...(isNumber(metadata.tokensIn) ? { tokensIn: metadata.tokensIn } : {}),
		...(isNumber(metadata.tokensOut) ? { tokensOut: metadata.tokensOut } : {}),
		...(isNumber(metadata.costUsd) ? { costUsd: metadata.costUsd } : {}),
	};

	return Object.keys(metrics).length > 0 ? metrics : undefined;
};

const resolveLevel = (
	eventType: string,
	metadata: Readonly<Record<string, unknown>>,
): RuntimeEvent['level'] => {
	if (
		eventType === RUNTIME_EVENT_TYPE.SnapshotReset
		|| eventType === RUNTIME_EVENT_TYPE.RuntimeInterrupted
		|| eventType === RUNTIME_EVENT_TYPE.ReviewBlocked
		|| eventType === RUNTIME_EVENT_TYPE.ReviewReviseRequired
		|| eventType === RUNTIME_EVENT_TYPE.CapabilityDenied
		|| eventType === RUNTIME_EVENT_TYPE.MemoryConflictDetected
	) {
		return RUNTIME_EVENT_LEVEL.Warn;
	}

	if (isString(metadata.errorCode)) {
		return RUNTIME_EVENT_LEVEL.Error;
	}

	return RUNTIME_EVENT_LEVEL.Info;
};

const createSnapshotEventId = (sessionId: string, sequence: number): string =>
	`${SNAPSHOT_EVENT_ID_PREFIX}${sessionId}:${sequence}`;

const createSnapshotResetEventId = (sessionId: string, sequence: number): string =>
	`${SNAPSHOT_RESET_EVENT_ID_PREFIX}${sessionId}:${sequence}`;

const createMetricsEventId = (sequence: number): string => `${METRICS_EVENT_ID_PREFIX}${sequence}`;

const createMetricsResetEventId = (sequence: number): string => `${METRICS_RESET_EVENT_ID_PREFIX}${sequence}`;

const parseTrailingSequence = (value: string, prefix: string): number | undefined => {
	if (!value.startsWith(prefix)) {
		return undefined;
	}

	const rawSequence = value.slice(value.lastIndexOf(':') + 1);
	const parsed = Number.parseInt(rawSequence, 10);

	return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
};

const resolveAfterSequence = (events: readonly RuntimeEvent[], lastEventId: string): number | undefined => {
	const snapshotSequence = parseTrailingSequence(lastEventId, SNAPSHOT_EVENT_ID_PREFIX);

	if (snapshotSequence !== undefined) {
		return snapshotSequence;
	}

	const snapshotResetSequence = parseTrailingSequence(lastEventId, SNAPSHOT_RESET_EVENT_ID_PREFIX);

	if (snapshotResetSequence !== undefined) {
		return snapshotResetSequence;
	}

	const matchedEvent = events.find((event) => event.eventId === lastEventId);

	return matchedEvent?.sequence;
};

const toSessionEvents = (
	session: RuntimeSession,
	auditEvents: readonly AuditEvent[],
	startSequence: number,
): readonly RuntimeEvent[] => {
	return auditEvents.map((auditEvent, index) => {
		const metadata = toRecord(auditEvent.metadata);
		const eventType = auditEvent.eventType;
		const actor = resolveActor(metadata);
		const target = resolveTarget(session.sessionId, eventType, metadata);
		const metrics = resolveMetrics(metadata);
		const payload: Record<string, unknown> = {
			reason: auditEvent.reason,
			evidenceRefs: auditEvent.evidenceRefs,
			...metadata,
		};

		return {
			eventId: auditEvent.eventId,
			traceId: session.state.context.traceId,
			sessionId: session.sessionId,
			sequence: startSequence + index,
			eventType,
			ts: auditEvent.timestamp,
			level: resolveLevel(eventType, metadata),
			...(actor === undefined ? {} : { actor }),
			...(target === undefined ? {} : { target }),
			...(metrics === undefined ? {} : { metrics }),
			payload,
		};
	});
};

const createMetricsPayload = (
	snapshotsById: ReadonlyMap<string, RuntimeSession>,
	counters: MetricsCounters,
	updatedAt: string,
): RuntimeMetricsPayload => {
	const runtimeSessionActive = {
		running: 0,
		paused: 0,
		terminated: 0,
	};

	for (const session of snapshotsById.values()) {
		if (session.status === 'running') {
			runtimeSessionActive.running += 1;
			continue;
		}

		if (session.status === 'paused') {
			runtimeSessionActive.paused += 1;
			continue;
		}

		runtimeSessionActive.terminated += 1;
	}

	return {
		runtimeSessionActive,
		runtimeAdvanceTotal: { ...counters.runtimeAdvanceTotal },
		runtimeEventTotal: { ...counters.runtimeEventTotal },
		pipelineStepDurationMs: Object.fromEntries(
			Object.entries(counters.pipelineStepDurationMs).map(([agentId, metric]) => [agentId, { ...metric }]),
		),
		pipelineInterruptTotal: { ...counters.pipelineInterruptTotal },
		reviewResultTotal: { ...counters.reviewResultTotal },
		memoryRetrievalTotal: { ...counters.memoryRetrievalTotal },
		agentToolCallTotal: { ...counters.agentToolCallTotal },
		updatedAt,
	};
};

export const createRuntimeSessionObservability = (
	repository: RuntimeObservabilityRepository,
): {
	readonly recordSession: (
		session: RuntimeSession,
		previousSession?: RuntimeSession,
	) => Promise<void>;
	readonly controller: RuntimeSessionObservability;
} => {
	const sessionEventsById = new Map<string, RuntimeEvent[]>();
	const snapshotsById = new Map<string, RuntimeSession>();
	const sessionSubscribersById = new Map<string, Set<SessionSubscriber>>();
	const metricsSubscribers = new Set<MetricsSubscriber>();
	const hydratedSessionIds = new Set<string>();
	const metricsCounters = createMetricsCounters();
	const metricsEvents: RuntimeEvent[] = [];
	let metricsHydrated = false;

	const hydrateMetrics = async (): Promise<void> => {
		if (metricsHydrated) {
			return;
		}

		const [events, snapshots] = await Promise.all([
			repository.listEvents(),
			repository.listLatestSnapshots(),
		]);

		for (const snapshot of snapshots) {
			snapshotsById.set(snapshot.session.sessionId, snapshot.session);
			hydratedSessionIds.add(snapshot.session.sessionId);
		}

		for (const event of events) {
			updateMetricsCounters(metricsCounters, event);
		}

		const timestamp = events.at(-1)?.ts ?? snapshots.at(-1)?.session.updatedAt ?? createTimestamp();
		metricsEvents.push({
			eventId: createMetricsEventId(1),
			traceId: events.at(-1)?.traceId ?? 'runtime-metrics',
			sessionId: 'runtime-metrics',
			sequence: 1,
			eventType: RUNTIME_EVENT_TYPE.MetricsUpdated,
			ts: timestamp,
			level: RUNTIME_EVENT_LEVEL.Info,
			payload: createMetricsPayload(snapshotsById, metricsCounters, timestamp),
		});
		metricsHydrated = true;
	};

	const hydrateSession = async (sessionId: string): Promise<void> => {
		if (hydratedSessionIds.has(sessionId)) {
			return;
		}

		const snapshot = await repository.loadSessionSnapshot(sessionId);

		if (snapshot === undefined) {
			hydratedSessionIds.add(sessionId);
			return;
		}

		const events = await repository.loadEventsAfterSequence(sessionId, 0);
		snapshotsById.set(sessionId, snapshot.session);
		sessionEventsById.set(sessionId, [...events]);
		hydratedSessionIds.add(sessionId);
	};

	const publishMetrics = async (triggerEvent: RuntimeEvent): Promise<void> => {
		await hydrateMetrics();
		updateMetricsCounters(metricsCounters, triggerEvent);

		const metricsEvent: RuntimeEvent<RuntimeMetricsPayload> = {
			eventId: createMetricsEventId(metricsEvents.length + 1),
			traceId: triggerEvent.traceId,
			sessionId: 'runtime-metrics',
			sequence: metricsEvents.length + 1,
			eventType: RUNTIME_EVENT_TYPE.MetricsUpdated,
			ts: triggerEvent.ts,
			level: RUNTIME_EVENT_LEVEL.Info,
			payload: createMetricsPayload(snapshotsById, metricsCounters, triggerEvent.ts),
		};

		metricsEvents.push(metricsEvent);

		for (const subscriber of metricsSubscribers) {
			subscriber.listener(metricsEvent);
		}
	};

	const createSnapshotEvent = (session: RuntimeSession): RuntimeEvent => {
		const events = sessionEventsById.get(getSessionKey(session.sessionId)) ?? [];
		const sequence = events.at(-1)?.sequence ?? 0;

		return {
			eventId: createSnapshotEventId(session.sessionId, sequence),
			traceId: session.state.context.traceId,
			sessionId: session.sessionId,
			sequence,
			eventType: RUNTIME_EVENT_TYPE.Snapshot,
			ts: session.updatedAt,
			level: RUNTIME_EVENT_LEVEL.Info,
			target: { type: 'runtime_session', id: session.sessionId },
			payload: buildRuntimeSessionPayload(session) as Record<string, unknown>,
		};
	};

	const createSnapshotResetEvent = (session: RuntimeSession, lastEventId: string): RuntimeEvent => {
		const events = sessionEventsById.get(getSessionKey(session.sessionId)) ?? [];
		const sequence = events.at(-1)?.sequence ?? 0;

		return {
			eventId: createSnapshotResetEventId(session.sessionId, sequence),
			traceId: session.state.context.traceId,
			sessionId: session.sessionId,
			sequence,
			eventType: RUNTIME_EVENT_TYPE.SnapshotReset,
			ts: createTimestamp(),
			level: RUNTIME_EVENT_LEVEL.Warn,
			target: { type: 'runtime_session', id: session.sessionId },
			payload: {
				lastEventId,
				reason: 'Last-Event-ID could not be replayed. Resetting stream state from the latest snapshot.',
			},
		};
	};

	const createMetricsResetEvent = (lastEventId: string): RuntimeEvent => ({
		eventId: createMetricsResetEventId(metricsEvents.length),
		traceId: 'runtime-metrics',
		sessionId: 'runtime-metrics',
		sequence: metricsEvents.length,
		eventType: RUNTIME_EVENT_TYPE.SnapshotReset,
		ts: createTimestamp(),
		level: RUNTIME_EVENT_LEVEL.Warn,
		payload: {
			lastEventId,
			reason: 'Metrics stream could not replay the requested event id. Resetting from the latest aggregate snapshot.',
		},
	});

	return {
		recordSession: async (session, previousSession): Promise<void> => {
			const sessionKey = getSessionKey(session.sessionId);
			const previousAuditLength = previousSession?.state.context.auditTrail.length ?? 0;
			const nextAuditEvents = session.state.context.auditTrail.slice(previousAuditLength);
			const currentEvents = sessionEventsById.get(sessionKey) ?? [];
			const nextEvents = toSessionEvents(session, nextAuditEvents, currentEvents.length + 1);
			const subscribers = sessionSubscribersById.get(sessionKey);

			snapshotsById.set(sessionKey, session);
			hydratedSessionIds.add(sessionKey);

			if (nextEvents.length === 0) {
				await repository.saveSessionState(session, []);
				return;
			}

			const storedEvents = [...currentEvents, ...nextEvents];
			sessionEventsById.set(sessionKey, storedEvents);
			await repository.saveSessionState(session, nextEvents);

			for (const event of nextEvents) {
				logRuntimeEvent(event);

				if (subscribers !== undefined) {
					for (const subscriber of subscribers) {
						if (subscriber.filter(event)) {
							subscriber.listener(event);
						}
					}
				}

				await publishMetrics(event);
			}
		},
		controller: {
			getSnapshotEvent: async (sessionId) => {
				await hydrateSession(sessionId);
				const session = snapshotsById.get(getSessionKey(sessionId));

				if (session === undefined) {
					return createMissingSession(sessionId);
				}

				return { ok: true, value: createSnapshotEvent(session) };
			},
			getSessionEvents: async (sessionId, options = {}) => {
				await hydrateSession(sessionId);
				const session = snapshotsById.get(getSessionKey(sessionId));

				if (session === undefined) {
					return createMissingSession(sessionId);
				}

				const sessionEvents = sessionEventsById.get(getSessionKey(sessionId)) ?? [];
				const filter = options.filter ?? allowAllEvents;

				if (options.lastEventId === undefined) {
					return {
						ok: true,
						value: {
							events: sessionEvents.filter(filter),
						},
					};
				}

				const afterSequence = resolveAfterSequence(sessionEvents, options.lastEventId);

				if (afterSequence === undefined) {
					return {
						ok: true,
						value: {
							resetEvent: createSnapshotResetEvent(session, options.lastEventId),
							events: sessionEvents.filter(filter),
						},
					};
				}

				return {
					ok: true,
					value: {
						events: sessionEvents.filter((event) => event.sequence > afterSequence && filter(event)),
					},
				};
			},
			subscribeToSession: async (sessionId, listener, options = {}) => {
				await hydrateSession(sessionId);

				if (!snapshotsById.has(getSessionKey(sessionId))) {
					return createMissingSession(sessionId);
				}

				const sessionKey = getSessionKey(sessionId);
				const subscribers = sessionSubscribersById.get(sessionKey) ?? new Set<SessionSubscriber>();
				const subscriber: SessionSubscriber = {
					filter: options.filter ?? allowAllEvents,
					listener,
				};

				subscribers.add(subscriber);
				sessionSubscribersById.set(sessionKey, subscribers);

				return {
					ok: true,
					value: () => {
						const currentSubscribers = sessionSubscribersById.get(sessionKey);

						if (currentSubscribers === undefined) {
							return;
						}

						currentSubscribers.delete(subscriber);

						if (currentSubscribers.size === 0) {
							sessionSubscribersById.delete(sessionKey);
						}
					},
				};
			},
			getMetricsEvents: async (lastEventId) => {
				await hydrateMetrics();
				const latestEvent = metricsEvents.at(-1);

				if (latestEvent === undefined) {
					return { events: [] };
				}

				if (lastEventId === undefined) {
					return { events: [latestEvent] };
				}

				const resetSequence = parseTrailingSequence(lastEventId, METRICS_RESET_EVENT_ID_PREFIX);
				const afterSequence = resetSequence
					?? parseTrailingSequence(lastEventId, METRICS_EVENT_ID_PREFIX)
					?? metricsEvents.find((event) => event.eventId === lastEventId)?.sequence;

				if (afterSequence === undefined) {
					return {
						resetEvent: createMetricsResetEvent(lastEventId),
						events: [latestEvent],
					};
				}

				return {
					events: metricsEvents.filter((event) => event.sequence > afterSequence),
				};
			},
			subscribeToMetrics: async (listener) => {
				await hydrateMetrics();
				const subscriber: MetricsSubscriber = { listener };
				metricsSubscribers.add(subscriber);

				return () => {
					metricsSubscribers.delete(subscriber);
				};
			},
		},
	};
};
