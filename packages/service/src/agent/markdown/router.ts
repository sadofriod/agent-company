import express, { type Request, type Response } from 'express';
import { z } from 'zod';

import type { AgentMarkdownAdapter } from '../../adapter/agentMarkdownAdapter';
import { createAgentMarkdownAdapter } from '../../adapter/createAgentMarkdownAdapter';
import type { SchemaIssue, ValidationResult } from '../../domain/base';

type AgentMarkdownRouterOptions = {
  readonly adapter?: AgentMarkdownAdapter;
  readonly agentsDirectory?: string;
};

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

const parseRequestBody = <TValue>(schema: z.ZodType<TValue>, body: unknown): ValidationResult<TValue> => {
  const parsedBody = schema.safeParse(body);

  if (parsedBody.success) {
    return { ok: true, value: parsedBody.data };
  }

  return {
    ok: false,
    issues: parsedBody.error.issues.map(requestIssue),
  };
};

const statusForIssues = (issues: readonly SchemaIssue[]): number => {
  const issueCodes = new Set(issues.map((issue) => issue.code));

  if (issueCodes.has('file_missing')) {
    return 404;
  }

  if (issueCodes.has('file_conflict')) {
    return 409;
  }

  return 400;
};

const sendValidationResult = <TValue>(response: Response, result: ValidationResult<TValue>): void => {
  if (result.ok) {
    response.json(result);
    return;
  }

  response.status(statusForIssues(result.issues)).json(result);
};

export const createAgentMarkdownRouter = (
  options: AgentMarkdownRouterOptions = {},
): express.Router => {
  const router = express.Router();
  const adapter = options.adapter ?? createAgentMarkdownAdapter({ agentsDirectory: options.agentsDirectory });

  router.get('/', async (_request: Request, response: Response): Promise<void> => {
    const files = await adapter.list();

    response.json({ ok: true, files });
  });

  router.post('/read', async (request: Request, response: Response): Promise<void> => {
    const parsedBody = parseRequestBody(pathBodySchema, request.body);

    if (!parsedBody.ok) {
      sendValidationResult(response, parsedBody);
      return;
    }

    const result = await adapter.read(parsedBody.value.path);

    sendValidationResult(response, result);
  });

  router.post('/validate', (request: Request, response: Response): void => {
    const parsedBody = parseRequestBody(writeBodySchema, request.body);

    if (!parsedBody.ok) {
      sendValidationResult(response, parsedBody);
      return;
    }

    const result = adapter.validate(parsedBody.value.path, parsedBody.value.content);

    sendValidationResult(response, result);
  });

  router.post('/', async (request: Request, response: Response): Promise<void> => {
    const parsedBody = parseRequestBody(writeBodySchema, request.body);

    if (!parsedBody.ok) {
      sendValidationResult(response, parsedBody);
      return;
    }

    const result = await adapter.write({
      path: parsedBody.value.path,
      content: parsedBody.value.content,
      mode: 'create',
    });

    sendValidationResult(response, result);
  });

  router.put('/', async (request: Request, response: Response): Promise<void> => {
    const parsedBody = parseRequestBody(writeBodySchema, request.body);

    if (!parsedBody.ok) {
      sendValidationResult(response, parsedBody);
      return;
    }

    const result = await adapter.write({
      path: parsedBody.value.path,
      content: parsedBody.value.content,
      mode: 'update',
    });

    sendValidationResult(response, result);
  });

  router.delete('/', async (request: Request, response: Response): Promise<void> => {
    const parsedBody = parseRequestBody(pathBodySchema, request.body);

    if (!parsedBody.ok) {
      sendValidationResult(response, parsedBody);
      return;
    }

    const result = await adapter.delete(parsedBody.value.path);

    sendValidationResult(response, result);
  });

  return router;
};