import type {
  AgentMarkdownDeleteResponse,
  AgentMarkdownFile,
  AgentMarkdownFileResponse,
  AgentMarkdownFileSummary,
  AgentMarkdownListResponse,
  AgentMarkdownValidationDetails,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';

const AGENT_MARKDOWN_ENDPOINT = '/agent-markdown';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isSchemaIssue = (value: unknown): value is {
  readonly code: string;
  readonly path: readonly string[];
  readonly message: string;
} =>
  isRecord(value)
  && typeof value.code === 'string'
  && Array.isArray(value.path)
  && value.path.every((entry) => typeof entry === 'string')
  && typeof value.message === 'string';

const formatApiError = (payload: unknown): string => {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message;
  }

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Agent Markdown request failed.';
};

const readPayload = async (response: Response): Promise<unknown> => {
  try {
    return await response.json() as unknown;
  } catch (_error) {
    return null;
  }
};

const toValidationFailure = <TResponse>(payload: unknown): TResponse | null => {
  if (!isRecord(payload) || payload.ok !== false || !isRecord(payload.error) || !Array.isArray(payload.error.issues)) {
    return null;
  }

  const issues = payload.error.issues.filter(isSchemaIssue);

  return { ok: false, issues } as TResponse;
};

const toSuccessPayload = <TResponse>(payload: unknown): TResponse | null => {
  if (!isRecord(payload) || payload.ok !== true || !('data' in payload)) {
    return null;
  }

  return payload.data as TResponse;
};

const toValidationSuccess = <TValue>(payload: unknown): { readonly ok: true; readonly value: TValue } | null => {
  const data = toSuccessPayload<TValue>(payload);

  if (data === null) {
    return null;
  }

  return { ok: true, value: data };
};

const readJson = async <TResponse>(response: Response): Promise<TResponse> => {
  const payload = await readPayload(response);

  if (!response.ok) {
    const validationFailure = toValidationFailure<TResponse>(payload);

    if (validationFailure !== null) {
      return validationFailure;
    }

    throw new Error(formatApiError(payload));
  }

  const successPayload = toSuccessPayload<TResponse>(payload);

  if (successPayload !== null) {
    return successPayload;
  }

  return payload as TResponse;
};

const sendJson = async <TResponse>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body: unknown,
): Promise<TResponse> => {
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return readJson<TResponse>(response);
};

export const listAgentMarkdownFiles = async (): Promise<AgentMarkdownListResponse> => {
  const response = await fetch(AGENT_MARKDOWN_ENDPOINT);

  return readJson<AgentMarkdownListResponse>(response);
};

export const readAgentMarkdownFile = async (path: string): Promise<AgentMarkdownFileResponse> => {
  const payload = await sendJson<unknown>(`${AGENT_MARKDOWN_ENDPOINT}/read`, 'POST', { path });
  const success = toValidationSuccess<AgentMarkdownFile>(payload);

  if (success !== null) {
    return success;
  }

  return payload as AgentMarkdownFileResponse;
};

export const validateAgentMarkdownDraft = async (
  path: string,
  content: string,
): Promise<AgentMarkdownValidationResponse> => {
  const payload = await sendJson<unknown>(`${AGENT_MARKDOWN_ENDPOINT}/validate`, 'POST', { path, content });
  const success = toValidationSuccess<AgentMarkdownValidationDetails>(payload);

  if (success !== null) {
    return success;
  }

  return payload as AgentMarkdownValidationResponse;
};

export const createAgentMarkdownFile = async (
  path: string,
  content: string,
): Promise<AgentMarkdownFileResponse> => {
  const payload = await sendJson<unknown>(AGENT_MARKDOWN_ENDPOINT, 'POST', { path, content });
  const success = toValidationSuccess<AgentMarkdownFile>(payload);

  if (success !== null) {
    return success;
  }

  return payload as AgentMarkdownFileResponse;
};

export const updateAgentMarkdownFile = async (
  path: string,
  content: string,
): Promise<AgentMarkdownFileResponse> => {
  const payload = await sendJson<unknown>(AGENT_MARKDOWN_ENDPOINT, 'PUT', { path, content });
  const success = toValidationSuccess<AgentMarkdownFile>(payload);

  if (success !== null) {
    return success;
  }

  return payload as AgentMarkdownFileResponse;
};

export const deleteAgentMarkdownFile = async (path: string): Promise<AgentMarkdownDeleteResponse> => {
  const payload = await sendJson<unknown>(AGENT_MARKDOWN_ENDPOINT, 'DELETE', { path });
  const success = toValidationSuccess<{ readonly path: string }>(payload);

  if (success !== null) {
    return success;
  }

  return payload as AgentMarkdownDeleteResponse;
};