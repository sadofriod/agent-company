import { z } from 'zod';
import type { Request } from 'express';

import type { AgentMarkdownAdapter } from '../../adapter/agentMarkdownAdapter';
import { createAgentMarkdownAdapter } from '../../adapter/createAgentMarkdownAdapter';
import type { SchemaIssue, ValidationResult } from '../../domain/base';

const pathBodySchema = z.object({
	path: z.string().min(1),
});

const writeBodySchema = pathBodySchema.extend({
	content: z.string(),
});

const requestIssue = (entry: z.ZodIssue): SchemaIssue => ({
	code: 'request_invalid',
	path: entry.path.map(String),
	message: entry.message,
});

export const parsePathBody = (body: unknown): ValidationResult<{ readonly path: string }> => {
	const parsedBody = pathBodySchema.safeParse(body);

	if (parsedBody.success) {
		return { ok: true, value: parsedBody.data };
	}

	return {
		ok: false,
		issues: parsedBody.error.issues.map(requestIssue),
	};
};

export const parseWriteBody = (
	body: unknown,
): ValidationResult<{ readonly path: string; readonly content: string }> => {
	const parsedBody = writeBodySchema.safeParse(body);

	if (parsedBody.success) {
		return { ok: true, value: parsedBody.data };
	}

	return {
		ok: false,
		issues: parsedBody.error.issues.map(requestIssue),
	};
};

export const resolveAgentMarkdownAdapter = (request: Request): AgentMarkdownAdapter => {
	const adapter = request.app.locals.agentMarkdownAdapter as AgentMarkdownAdapter | undefined;

	if (adapter !== undefined) {
		return adapter;
	}

	return createAgentMarkdownAdapter();
};