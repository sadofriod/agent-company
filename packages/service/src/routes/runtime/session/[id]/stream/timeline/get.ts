import type { RequestHandler } from 'express';

import { streamRuntimeSessionEvents } from '../../../../../_shared/runtimeObservability';

const handler: RequestHandler = (request, response): void => {
	streamRuntimeSessionEvents(request, response, {});
};

export default handler;
