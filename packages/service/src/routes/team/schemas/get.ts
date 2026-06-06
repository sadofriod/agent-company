import type { RequestHandler } from 'express';

import { sendData } from '../../_shared/response';
import { listTeamSchemaDocuments } from '../../../schema/teamSchemaDocument';

const handler: RequestHandler = async (_request, response): Promise<void> => {
	const result = await listTeamSchemaDocuments();

	if (!result.ok) {
		return;
	}

	sendData(response, { schemas: result.value });
};

export default handler;