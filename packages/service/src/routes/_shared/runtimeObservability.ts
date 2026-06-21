import type { Request, RequestHandler, Response } from 'express';

import type { SchemaIssue } from '../../domain/base';
import type { RuntimeEvent } from '../../domain/runtimeEvent';
import {
	isInterruptionRuntimeEvent,
	isReviewRuntimeEvent,
} from '../../domain/runtimeEvent';
import { sendErrorResponse } from './response';
import {
	isRuntimeSessionMissing,
	resolveRuntimeSessionScheduler,
} from './runtimeSession';
import { getLastEventId, openSseStream, writeSseEvent, writeSseHeartbeat } from './sse';

const HEARTBEAT_INTERVAL_MS = 15_000;

const isString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

const sendRuntimeSessionError = (
	response: Response,
	result: {
		readonly ok: false;
		readonly issues: readonly SchemaIssue[];
	},
): void => {
	sendErrorResponse(response, isRuntimeSessionMissing(result.issues) ? 404 : 400, {
		code: isRuntimeSessionMissing(result.issues) ? 'not_found' : 'validation_failed',
		message: isRuntimeSessionMissing(result.issues)
			? 'Requested runtime session was not found.'
			: 'Request validation failed.',
		issues: result.issues,
	});
};

const resolveSessionId = (request: Request, response: Response): string | undefined => {
	const sessionId = request.params.id;

	if (typeof sessionId === 'string') {
		return sessionId;
	}

	sendErrorResponse(response, 400, {
		code: 'request_invalid',
		message: 'Runtime session id is required.',
	});
	return undefined;
};

const startHeartbeat = (response: Response): NodeJS.Timeout =>
	setInterval(() => {
		writeSseHeartbeat(response);
	}, HEARTBEAT_INTERVAL_MS);

const cleanupStream = (
	request: Request,
	response: Response,
	unsubscribe: () => void,
	heartbeat: NodeJS.Timeout,
): void => {
	request.on('close', () => {
		clearInterval(heartbeat);
		unsubscribe();
		response.end();
	});
};

export const matchesStepTraceEvent = (event: RuntimeEvent, stepId: string): boolean => {
	if (event.target?.id === stepId) {
		return true;
	}

	const stepTraceFields = ['stepId', 'fromStepId', 'toStepId'] as const;

	return stepTraceFields.some((field) => event.payload[field] === stepId);
};

export const streamRuntimeSessionEvents = (
	request: Request,
	response: Response,
	options: {
		readonly includeSnapshot?: boolean;
		readonly filter?: (event: RuntimeEvent) => boolean;
	},
): void => {
	const sessionId = resolveSessionId(request, response);

	if (sessionId === undefined) {
		return;
	}

	const scheduler = resolveRuntimeSessionScheduler(request);
	const filter = options.filter;
	const lastEventId = getLastEventId(request);
	const replayResult = scheduler.observability.getSessionEvents(sessionId, { lastEventId, filter });

	if (!replayResult.ok) {
		sendRuntimeSessionError(response, replayResult);
		return;
	}

	const snapshotResult = options.includeSnapshot
		? scheduler.observability.getSnapshotEvent(sessionId)
		: undefined;

	if (snapshotResult !== undefined && !snapshotResult.ok) {
		sendRuntimeSessionError(response, snapshotResult);
		return;
	}

	const subscriptionResult = scheduler.observability.subscribeToSession(
		sessionId,
		(event) => {
			writeSseEvent(response, event);
		},
		{ filter },
	);

	if (!subscriptionResult.ok) {
		sendRuntimeSessionError(response, subscriptionResult);
		return;
	}

	openSseStream(response);

	if (replayResult.value.resetEvent !== undefined) {
		writeSseEvent(response, replayResult.value.resetEvent);
	}

	if (
		snapshotResult !== undefined
		&& (lastEventId === undefined || replayResult.value.resetEvent !== undefined)
	) {
		writeSseEvent(response, snapshotResult.value);
	}

	for (const event of replayResult.value.events) {
		writeSseEvent(response, event);
	}

	const heartbeat = startHeartbeat(response);
	cleanupStream(request, response, subscriptionResult.value, heartbeat);
};

export const streamRuntimeMetrics: RequestHandler = (request, response): void => {
	const scheduler = resolveRuntimeSessionScheduler(request);
	const replay = scheduler.observability.getMetricsEvents(getLastEventId(request));
	const unsubscribe = scheduler.observability.subscribeToMetrics((event) => {
		writeSseEvent(response, event);
	});

	openSseStream(response);

	if (replay.resetEvent !== undefined) {
		writeSseEvent(response, replay.resetEvent);
	}

	for (const event of replay.events) {
		writeSseEvent(response, event);
	}

	const heartbeat = startHeartbeat(response);
	cleanupStream(request, response, unsubscribe, heartbeat);
};

export const streamInterruptionEvents: RequestHandler = (request, response): void => {
	streamRuntimeSessionEvents(request, response, {
		filter: isInterruptionRuntimeEvent,
	});
};

export const streamReviewEvents: RequestHandler = (request, response): void => {
	streamRuntimeSessionEvents(request, response, {
		filter: isReviewRuntimeEvent,
	});
};

export const streamStepTraceEvents: RequestHandler = (request, response): void => {
	const stepId = request.params.stepId;

	if (!isString(stepId)) {
		sendErrorResponse(response, 400, {
			code: 'request_invalid',
			message: 'Runtime pipeline step id is required.',
		});
		return;
	}

	streamRuntimeSessionEvents(request, response, {
		filter: (event) => matchesStepTraceEvent(event, stepId),
	});
};
