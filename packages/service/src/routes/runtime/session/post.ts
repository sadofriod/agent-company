import type { RequestHandler } from 'express';

import { loadTeamSchema } from '../../../schema/loadTeamSchema';
import { isStoredTeamSchemaMissing, readTeamSchemaDocument } from '../../../schema/teamSchemaDocument';
import { buildRuntimeSessionPayload } from '../../../runtime/buildRuntimeSessionPayload';
import {
	parseRuntimeSessionStartBody,
	resolveRuntimeSessionScheduler,
} from '../../_shared/runtimeSession';
import { sendData, sendValidationResult } from '../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const parsedBody = parseRuntimeSessionStartBody(request.body);

	if (!parsedBody.ok) {
		sendValidationResult(response, parsedBody);
		return;
	}

	const teamValidation = parsedBody.value.team === undefined
		? await (async () => {
			const storedSchema = await readTeamSchemaDocument();

			if (!storedSchema.ok) {
				return storedSchema;
			}

			return loadTeamSchema(storedSchema.value);
		})()
		: loadTeamSchema(parsedBody.value.team);

	if (!teamValidation.ok) {
		if (parsedBody.value.team === undefined && !isStoredTeamSchemaMissing(teamValidation.issues)) {
			sendValidationResult(response, teamValidation, {
				status: 500,
				code: 'schema_invalid',
				message: 'Stored team schema is invalid.',
			});
			return;
		}

		sendValidationResult(response, teamValidation);
		return;
	}

	const runtimeSession = resolveRuntimeSessionScheduler(request).startSession({
		team: teamValidation.value,
		task: parsedBody.value.task,
		...(parsedBody.value.traceId === undefined ? {} : { traceId: parsedBody.value.traceId }),
	});

	sendData(response, buildRuntimeSessionPayload(runtimeSession), 201);
};

export default handler;