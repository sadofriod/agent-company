import type { RequestHandler } from 'express';

import { sendData, sendValidationResult } from '../../_shared/response';
import { listTeamSchemaDocuments } from '../../../schema/teamSchemaDocument';

const handler: RequestHandler = async (_request, response): Promise<void> => {
	const result = await listTeamSchemaDocuments();

	if (!result.ok) {
		sendValidationResult(response, result, {
			status: 500,
			code: 'schema_list_failed',
			message: 'Unable to list team schemas.',
		});
		return;
	}

	sendData(response, { schemas: result.value });
};

export default handler;