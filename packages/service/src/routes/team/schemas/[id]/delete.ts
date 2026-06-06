import type { RequestHandler } from 'express';

import { deleteTeamSchemaDocument } from '../../../../schema/teamSchemaDocument';
import { sendValidationResult } from '../../../_shared/response';

const handler: RequestHandler = async (_request, response): Promise<void> => {
  const result = await deleteTeamSchemaDocument();

  sendValidationResult(response, result);
};

export default handler;