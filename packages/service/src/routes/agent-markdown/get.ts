import type { RequestHandler } from 'express';

import { resolveAgentMarkdownAdapter } from '../_shared/agentMarkdown';
import { sendData } from '../_shared/response';

const handler: RequestHandler = async (request, response): Promise<void> => {
	const files = await resolveAgentMarkdownAdapter(request).list();

	sendData(response, { files });
};

export default handler;