import type { RequestHandler } from 'express';

import { sendData, sendValidationResult } from '../_shared/response';
import { buildRuntimePlanPayload } from '../../runtime/buildRuntimePlanPayload';
import { loadTeamSchema } from '../../schema/loadTeamSchema';

const handler: RequestHandler = (request, response): void => {
	const validation = loadTeamSchema(request.body);

	if (!validation.ok) {
		sendValidationResult(response, validation);
		return;
	}

	sendData(response, buildRuntimePlanPayload(validation.value));
};

export default handler;