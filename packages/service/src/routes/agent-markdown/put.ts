import type { RequestHandler } from 'express';

import { AgentMarkdownWriteMode } from '../../agent/markdown';
import { parseWriteBody, resolveAgentMarkdownAdapter } from '../_shared/agentMarkdown';
import { sendValidationResult } from '../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const parsedBody = parseWriteBody(request.body);

	if (!parsedBody.ok) {
		sendValidationResult(response, parsedBody);
		return;
	}

	const result = await resolveAgentMarkdownAdapter(request).write({
		path: parsedBody.value.path,
		content: parsedBody.value.content,
		mode: AgentMarkdownWriteMode.Update,
	});

	sendValidationResult(response, result);
};

export default handler;