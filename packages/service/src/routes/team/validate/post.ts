import type { RequestHandler } from 'express';

import { loadTeamSchema } from '../../../schema/loadTeamSchema';
import { sendData, sendValidationResult } from '../../_shared/response';

const handler: RequestHandler = (request, response): void => {
	const validation = loadTeamSchema(request.body);

	if (!validation.ok) {
		sendValidationResult(response, validation);
		return;
	}

	sendData(response, { team: validation.value });
};

export default handler;