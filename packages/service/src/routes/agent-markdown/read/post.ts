import type { RequestHandler } from 'express';

import { parsePathBody, resolveAgentMarkdownAdapter } from '../../_shared/agentMarkdown';
import { sendValidationResult } from '../../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const parsedBody = parsePathBody(request.body);

	if (!parsedBody.ok) {
		sendValidationResult(response, parsedBody);
		return;
	}

	const result = await resolveAgentMarkdownAdapter(request).read(parsedBody.value.path);

	sendValidationResult(response, result);
};

export default handler;