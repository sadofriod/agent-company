import type { RequestHandler } from 'express';

import { parseWriteBody, resolveAgentMarkdownAdapter } from '../../_shared/agentMarkdown';
import { sendValidationResult } from '../../_shared/response';

const handler: RequestHandler = (request, response): void => {
	const parsedBody = parseWriteBody(request.body);

	if (!parsedBody.ok) {
		sendValidationResult(response, parsedBody);
		return;
	}

	const result = resolveAgentMarkdownAdapter(request).validate(parsedBody.value.path, parsedBody.value.content);

	sendValidationResult(response, result);
};

export default handler;