import type { RequestHandler } from 'express';

import { parseTeamSchemaDocument, updateTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
import { sendData, sendValidationResult } from '../../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
  const parsedBody = parseTeamSchemaDocument(request.body);

  if (!parsedBody.ok) {
    sendValidationResult(response, parsedBody);
    return;
  }

  const result = await updateTeamSchemaDocument(parsedBody.value);

  if (!result.ok) {
    sendValidationResult(response, result);
    return;
  }

  sendData(response, { schema: result.value });
};

export default handler;