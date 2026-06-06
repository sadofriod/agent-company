import type { RequestHandler } from 'express';

import { loadTeamSchema } from '../../../../schema/loadTeamSchema';
import { isStoredTeamSchemaMissing, readTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
import { sendData, sendValidationResult } from '../../../_shared/response';

const handler: RequestHandler = async (_request, response): Promise<void> => {
	const storedSchema = await readTeamSchemaDocument();

	if (!storedSchema.ok) {
		if (isStoredTeamSchemaMissing(storedSchema.issues)) {
			sendValidationResult(response, storedSchema);
			return;
		}

		sendValidationResult(response, storedSchema, {
			status: 500,
			code: 'schema_invalid',
			message: 'Stored team schema is invalid.',
		});
		return;
	}

	const validation = loadTeamSchema(storedSchema.value);

	if (!validation.ok) {
		sendValidationResult(response, validation, {
			status: 500,
			code: 'schema_invalid',
			message: 'Stored team schema is invalid.',
		});
		return;
	}

	sendData(response, { schema: storedSchema.value });
};

export default handler;