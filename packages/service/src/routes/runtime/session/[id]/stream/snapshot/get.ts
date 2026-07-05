import type { RequestHandler } from 'express';

import { streamRuntimeSessionEvents } from '../../../../../_shared/runtimeObservability';

const handler: RequestHandler = async (request, response): Promise<void> => {
	await streamRuntimeSessionEvents(request, response, { includeSnapshot: true });
};

export default handler;
