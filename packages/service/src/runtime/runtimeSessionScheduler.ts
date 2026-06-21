import { randomUUID } from 'node:crypto';

import type { ValidationResult } from '../domain/base';
import type { TeamDefinition } from '../domain/organization';
import {
	RUNTIME_SESSION_STATUS,
	type RuntimeSession,
	type RuntimeTask,
} from '../domain/runtime';
import { RUNTIME_EVENT_TYPE } from '../domain/runtimeEvent';

import { advanceRuntimeSession } from './advanceRuntimeSession';
import type { AgentStepRunner } from './agentStepRunner';
import { createExecutionContext } from './createExecutionContext';
import { createRuntimePlan } from './createRuntimePlan';
import {
	createRuntimeSessionObservability,
	type RuntimeSessionObservability,
} from './runtimeObservability';
import {
	createAuditEvent,
	createIssue,
	createTimestamp,
	toRuntimeId,
} from './runtimeEngineShared';

const RUNTIME_SESSION_ACTION = {
	Pause: 'pause',
	Resume: 'resume',
	Advance: 'advance',
	Terminate: 'terminate',
} as const;

type RuntimeSessionAction = typeof RUNTIME_SESSION_ACTION[keyof typeof RUNTIME_SESSION_ACTION];

type StartRuntimeSessionInput = {
	readonly task: RuntimeTask;
	readonly team: TeamDefinition;
	readonly traceId?: string;
};

export type RuntimeSessionSchedulerOptions = {
	readonly stepRunner?: AgentStepRunner;
};

export type RuntimeSessionScheduler = {
	readonly startSession: (input: StartRuntimeSessionInput) => RuntimeSession;
	readonly getSession: (sessionId: string) => ValidationResult<RuntimeSession>;
	readonly pauseSession: (sessionId: string) => ValidationResult<RuntimeSession>;
	readonly resumeSession: (sessionId: string) => ValidationResult<RuntimeSession>;
	readonly advanceSession: (sessionId: string) => ValidationResult<RuntimeSession>;
	readonly terminateSession: (sessionId: string) => ValidationResult<RuntimeSession>;
	readonly observability: RuntimeSessionObservability;
};

const SESSION_TRANSITIONS: Readonly<
	Record<RuntimeSession['status'], Partial<Record<RuntimeSessionAction, RuntimeSession['status']>>>
> = {
	running: {
		pause: RUNTIME_SESSION_STATUS.Paused,
		terminate: RUNTIME_SESSION_STATUS.Terminated,
	},
	paused: {
		resume: RUNTIME_SESSION_STATUS.Running,
		terminate: RUNTIME_SESSION_STATUS.Terminated,
	},
	terminated: {},
};

const ACTION_EVENT_TYPE: Readonly<Record<RuntimeSessionAction | 'start', string>> = {
	start: RUNTIME_EVENT_TYPE.RuntimeSessionStarted,
	pause: RUNTIME_EVENT_TYPE.RuntimeSessionPaused,
	resume: RUNTIME_EVENT_TYPE.RuntimeSessionResumed,
	advance: RUNTIME_EVENT_TYPE.RuntimeSessionAdvanced,
	terminate: RUNTIME_EVENT_TYPE.RuntimeSessionTerminated,
};

const ACTION_REASON: Readonly<Record<RuntimeSessionAction | 'start', string>> = {
	start: 'Runtime session started.',
	pause: 'Runtime session paused by API request.',
	resume: 'Runtime session resumed by API request.',
	advance: 'Runtime session advanced by API request.',
	terminate: 'Runtime session terminated by API request.',
};

const ACTION_NEXT_STEP: Readonly<Record<typeof RUNTIME_SESSION_STATUS[keyof typeof RUNTIME_SESSION_STATUS], string>> = {
	running: 'Session is running and ready for the next execution step.',
	paused: 'Session is paused. Call resume to continue execution.',
	terminated: 'Session is terminated and cannot continue execution.',
};

const createSessionNotFound = (sessionId: string): ValidationResult<RuntimeSession> => ({
	ok: false,
	issues: [
		createIssue(
			'runtime_session_missing',
			['sessionId'],
			`Runtime session '${sessionId}' was not found.`,
			'Start a new session before issuing lifecycle commands.',
		),
	],
});

const createSessionNotRunning = (session: RuntimeSession): ValidationResult<RuntimeSession> => ({
	ok: false,
	issues: [
		createIssue(
			'runtime_session_not_running',
			['status'],
			`Cannot advance a runtime session in '${session.status}' status.`,
			'Resume the session before advancing it.',
		),
	],
	});

const createInvalidTransition = (
	session: RuntimeSession,
	action: RuntimeSessionAction,
): ValidationResult<RuntimeSession> => ({
	ok: false,
	issues: [
		createIssue(
			'runtime_session_transition_invalid',
			['status'],
			`Cannot ${action} a runtime session in '${session.status}' status.`,
			'Retry with a valid lifecycle transition.',
		),
	],
});

const appendAuditEvent = (
	session: RuntimeSession,
	eventType: string,
	reason: string,
	nextStatus: RuntimeSession['status'],
	timestamp: string,
): RuntimeSession => {
	const auditEvent = createAuditEvent(session.sessionId, eventType, reason, timestamp, {
		sessionStatus: nextStatus,
	});
	const auditTrail = [...session.state.context.auditTrail, auditEvent];

	return {
		...session,
		status: nextStatus,
		updatedAt: timestamp,
		state: {
			...session.state,
			context: {
				...session.state.context,
				auditTrail,
			},
			nextAction: ACTION_NEXT_STEP[nextStatus],
		},
	};
};

const getTransitionTarget = (
	status: RuntimeSession['status'],
	action: RuntimeSessionAction,
): RuntimeSession['status'] | undefined => {
	return SESSION_TRANSITIONS[status][action];
};

const applyAction = (
	sessions: Map<ReturnType<typeof toRuntimeId>, RuntimeSession>,
	recordSession: (session: RuntimeSession, previousSession?: RuntimeSession) => void,
	sessionId: string,
	action: RuntimeSessionAction,
): ValidationResult<RuntimeSession> => {
	const runtimeId = toRuntimeId(sessionId);
	const session = sessions.get(runtimeId);

	if (session === undefined) {
		return createSessionNotFound(sessionId);
	}

	const nextStatus = getTransitionTarget(session.status, action);

	if (nextStatus === undefined) {
		return createInvalidTransition(session, action);
	}

	const timestamp = createTimestamp();
	const nextSession = appendAuditEvent(
		session,
		ACTION_EVENT_TYPE[action],
		ACTION_REASON[action],
		nextStatus,
		timestamp,
	);

	sessions.set(nextSession.sessionId, nextSession);
	recordSession(nextSession, session);

	return { ok: true, value: nextSession };
};

const advanceSession = (
	sessions: Map<ReturnType<typeof toRuntimeId>, RuntimeSession>,
	recordSession: (session: RuntimeSession, previousSession?: RuntimeSession) => void,
	sessionId: string,
	options: RuntimeSessionSchedulerOptions,
): ValidationResult<RuntimeSession> => {
	const runtimeId = toRuntimeId(sessionId);
	const session = sessions.get(runtimeId);

	if (session === undefined) {
		return createSessionNotFound(sessionId);
	}

	if (session.status !== RUNTIME_SESSION_STATUS.Running) {
		return createSessionNotRunning(session);
	}

	const advancedSession = advanceRuntimeSession(session, { stepRunner: options.stepRunner });

	if (!advancedSession.ok) {
		return advancedSession;
	}

	const timestamp = createTimestamp();
	const auditEvent = createAuditEvent(
		advancedSession.value.sessionId,
		ACTION_EVENT_TYPE.advance,
		ACTION_REASON.advance,
		timestamp,
	);
	const nextSession: RuntimeSession = {
		...advancedSession.value,
		updatedAt: timestamp,
		state: {
			...advancedSession.value.state,
			context: {
				...advancedSession.value.state.context,
				auditTrail: [...advancedSession.value.state.context.auditTrail, auditEvent],
			},
		},
	};

	sessions.set(nextSession.sessionId, nextSession);
	recordSession(nextSession, session);

	return { ok: true, value: nextSession };
};

export const createRuntimeSessionScheduler = (
	options: RuntimeSessionSchedulerOptions = {},
): RuntimeSessionScheduler => {
	const sessions = new Map<ReturnType<typeof toRuntimeId>, RuntimeSession>();
	const observability = createRuntimeSessionObservability();

	return {
		startSession: (input: StartRuntimeSessionInput): RuntimeSession => {
			const sessionId = toRuntimeId(randomUUID());
			const traceId = input.traceId ?? randomUUID();
			const timestamp = createTimestamp();
			const runtimePlan = createRuntimePlan(input.team);
			const auditEvent = createAuditEvent(
				sessionId,
				ACTION_EVENT_TYPE.start,
				ACTION_REASON.start,
				timestamp,
				{ sessionStatus: RUNTIME_SESSION_STATUS.Running },
			);
			const session: RuntimeSession = {
				sessionId,
				status: RUNTIME_SESSION_STATUS.Running,
				createdAt: timestamp,
				updatedAt: timestamp,
				runtimePlan,
				state: createExecutionContext({
					runtimeId: sessionId,
					runtimePlan,
					task: input.task,
					traceId,
					auditTrail: [auditEvent],
				}),
			};

			sessions.set(sessionId, session);
			observability.recordSession(session);

			return session;
		},
		getSession: (sessionId: string): ValidationResult<RuntimeSession> => {
			const runtimeId = toRuntimeId(sessionId);
			const session = sessions.get(runtimeId);

			if (session === undefined) {
				return createSessionNotFound(sessionId);
			}

			return { ok: true, value: session };
		},
		pauseSession: (sessionId: string): ValidationResult<RuntimeSession> =>
			applyAction(sessions, observability.recordSession, sessionId, RUNTIME_SESSION_ACTION.Pause),
		resumeSession: (sessionId: string): ValidationResult<RuntimeSession> =>
			applyAction(sessions, observability.recordSession, sessionId, RUNTIME_SESSION_ACTION.Resume),
		advanceSession: (sessionId: string): ValidationResult<RuntimeSession> =>
			advanceSession(sessions, observability.recordSession, sessionId, options),
		terminateSession: (sessionId: string): ValidationResult<RuntimeSession> =>
			applyAction(sessions, observability.recordSession, sessionId, RUNTIME_SESSION_ACTION.Terminate),
		observability: observability.controller,
	};
};