import type { RequestHandler } from 'express';

import { sendData } from '../_shared/response';

const handler: RequestHandler = (_request, response): void => {
	sendData(response, { status: 'ok' });
};

export default handler;