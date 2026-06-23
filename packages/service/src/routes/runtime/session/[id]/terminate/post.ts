import type { RequestHandler } from 'express';

import {
	isRuntimeSessionMissing,
	isRuntimeSessionTransitionInvalid,
	resolveRuntimeSessionScheduler,
} from '../../../../_shared/runtimeSession';
import { buildRuntimeSessionPayload } from '../../../../../runtime/buildRuntimeSessionPayload';
import { sendData, sendErrorResponse } from '../../../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const sessionId = request.params.id;

	if (typeof sessionId !== 'string') {
		sendErrorResponse(response, 400, {
			code: 'request_invalid',
			message: 'Runtime session id is required.',
		});
		return;
	}

	const result = await resolveRuntimeSessionScheduler(request).terminateSession(sessionId);

	if (!result.ok) {
		const status = isRuntimeSessionMissing(result.issues)
			? 404
			: isRuntimeSessionTransitionInvalid(result.issues)
				? 409
				: 400;
		const code = isRuntimeSessionMissing(result.issues)
			? 'not_found'
			: isRuntimeSessionTransitionInvalid(result.issues)
				? 'conflict'
				: 'validation_failed';
		const message = isRuntimeSessionMissing(result.issues)
			? 'Requested runtime session was not found.'
			: isRuntimeSessionTransitionInvalid(result.issues)
				? 'Runtime session cannot be terminated from its current status.'
				: 'Request validation failed.';

		sendErrorResponse(response, status, { code, message, issues: result.issues });
		return;
	}

	sendData(response, buildRuntimeSessionPayload(result.value));
};

export default handler;