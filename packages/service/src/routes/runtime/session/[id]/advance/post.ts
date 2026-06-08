import type { RequestHandler } from 'express';

import {
	isRuntimeSessionMissing,
	isRuntimeSessionNotRunning,
	resolveRuntimeSessionScheduler,
} from '../../../../_shared/runtimeSession';
import { buildRuntimeSessionPayload } from '../../../../../runtime/buildRuntimeSessionPayload';
import { sendData, sendErrorResponse } from '../../../../_shared/response';

const handler: RequestHandler = (request, response): void => {
	const sessionId = request.params.id;

	if (typeof sessionId !== 'string') {
		sendErrorResponse(response, 400, {
			code: 'request_invalid',
			message: 'Runtime session id is required.',
		});
		return;
	}

	const result = resolveRuntimeSessionScheduler(request).advanceSession(sessionId);

	if (!result.ok) {
		const status = isRuntimeSessionMissing(result.issues)
			? 404
			: isRuntimeSessionNotRunning(result.issues)
				? 409
				: 400;
		const code = isRuntimeSessionMissing(result.issues)
			? 'not_found'
			: isRuntimeSessionNotRunning(result.issues)
				? 'conflict'
				: 'validation_failed';
		const message = isRuntimeSessionMissing(result.issues)
			? 'Requested runtime session was not found.'
			: isRuntimeSessionNotRunning(result.issues)
				? 'Runtime session must be running before it can advance.'
				: 'Request validation failed.';

		sendErrorResponse(response, status, { code, message, issues: result.issues });
		return;
	}

	sendData(response, buildRuntimeSessionPayload(result.value));
};

export default handler;