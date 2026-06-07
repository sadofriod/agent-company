import type { RequestHandler } from 'express';

import { buildAgentGatewayPayload } from '../../runtime/buildAgentGatewayPayload';
import { loadTeamSchema } from '../../schema/loadTeamSchema';
import { sendData, sendValidationResult } from '../_shared/response';

const handler: RequestHandler = (request, response) => {
  const validation = loadTeamSchema(request.body);

  if (!validation.ok) {
    sendValidationResult(response, validation);
    return;
  }

  sendData(response, buildAgentGatewayPayload(validation.value));
};

export default handler;