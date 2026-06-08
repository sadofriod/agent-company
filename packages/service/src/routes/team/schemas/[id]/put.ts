import type { RequestHandler } from 'express';

import { parseTeamSchemaDocument, updateTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
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

  const parsedBody = parseTeamSchemaDocument(request.body);

  if (!parsedBody.ok) {
    sendValidationResult(response, parsedBody);
    return;
  }

  const result = await updateTeamSchemaDocument(schemaKey, parsedBody.value);

  if (!result.ok) {
    sendValidationResult(response, result);
    return;
  }

  sendData(response, { schema: result.value });
};

export default handler;