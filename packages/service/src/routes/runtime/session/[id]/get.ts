import type { RequestHandler } from 'express';

import {
	isRuntimeSessionMissing,
	resolveRuntimeSessionScheduler,
} from '../../../_shared/runtimeSession';
import { buildRuntimeSessionPayload } from '../../../../runtime/buildRuntimeSessionPayload';
import { sendErrorResponse, sendData } from '../../../_shared/response';

const handler: RequestHandler = (request, response): void => {
	const sessionId = request.params.id;

	if (typeof sessionId !== 'string') {
		sendErrorResponse(response, 400, {
			code: 'request_invalid',
			message: 'Runtime session id is required.',
		});
		return;
	}

	const result = resolveRuntimeSessionScheduler(request).getSession(sessionId);

	if (!result.ok) {
		sendErrorResponse(response, isRuntimeSessionMissing(result.issues) ? 404 : 400, {
			code: isRuntimeSessionMissing(result.issues) ? 'not_found' : 'validation_failed',
			message: isRuntimeSessionMissing(result.issues)
				? 'Requested runtime session was not found.'
				: 'Request validation failed.',
			issues: result.issues,
		});
		return;
	}

	sendData(response, buildRuntimeSessionPayload(result.value));
};

export default handler;