import type { RequestHandler } from 'express';

import { loadTeamSchema } from '../../../../schema/loadTeamSchema';
import { isStoredTeamSchemaMissing, readTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
import { sendData, sendErrorResponse, sendValidationResult } from '../../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const schemaKey = request.params.id;

	if (typeof schemaKey !== 'string') {
		sendErrorResponse(response, 400, {
			code: 'request_invalid',
			message: 'Team schema id is required.',
		});
		return;
	}

	const storedSchema = await readTeamSchemaDocument(schemaKey);

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