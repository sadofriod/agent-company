import type {
  AgentMarkdownDeleteResponse,
  AgentMarkdownFileResponse,
  AgentMarkdownListResponse,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';

const AGENT_MARKDOWN_ENDPOINT = '/agent-markdown';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const formatApiError = (payload: unknown): string => {
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

const readJson = async <TResponse>(response: Response): Promise<TResponse> => {
  const payload = await readPayload(response);

  if (!response.ok) {
    throw new Error(formatApiError(payload));
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

export const readAgentMarkdownFile = async (path: string): Promise<AgentMarkdownFileResponse> =>
  sendJson<AgentMarkdownFileResponse>(`${AGENT_MARKDOWN_ENDPOINT}/read`, 'POST', { path });

export const validateAgentMarkdownDraft = async (
  path: string,
  content: string,
): Promise<AgentMarkdownValidationResponse> =>
  sendJson<AgentMarkdownValidationResponse>(`${AGENT_MARKDOWN_ENDPOINT}/validate`, 'POST', { path, content });

export const createAgentMarkdownFile = async (
  path: string,
  content: string,
): Promise<AgentMarkdownFileResponse> =>
  sendJson<AgentMarkdownFileResponse>(AGENT_MARKDOWN_ENDPOINT, 'POST', { path, content });

export const updateAgentMarkdownFile = async (
  path: string,
  content: string,
): Promise<AgentMarkdownFileResponse> =>
  sendJson<AgentMarkdownFileResponse>(AGENT_MARKDOWN_ENDPOINT, 'PUT', { path, content });

export const deleteAgentMarkdownFile = async (path: string): Promise<AgentMarkdownDeleteResponse> =>
  sendJson<AgentMarkdownDeleteResponse>(AGENT_MARKDOWN_ENDPOINT, 'DELETE', { path });