import type { RequestHandler } from 'express';

import { deleteTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
import { sendErrorResponse, sendValidationResult } from '../../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
  const schemaKey = request.params.id;

  if (typeof schemaKey !== 'string') {
    sendErrorResponse(response, 400, {
      code: 'request_invalid',
      message: 'Team schema id is required.',
    });
    return;
  }

  const result = await deleteTeamSchemaDocument(schemaKey);

  sendValidationResult(response, result);
};

export default handler;