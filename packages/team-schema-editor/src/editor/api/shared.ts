import type { SchemaIssue } from '@agents-team/service/domain/base';
import type {
  AgentMarkdownDeleteResponse,
  AgentMarkdownFile,
  AgentMarkdownFileResponse,
  AgentMarkdownValidationDetails,
  AgentMarkdownValidationResponse,
} from '@agents-team/service/agent/markdown';

import type { RuntimeTaskDraft, ValidationIssue } from '../model/types';

export const TEAM_SCHEMA_BASE = '/team/schemas';
export const TEAM_VALIDATE_ENDPOINT = '/team/validate';
export const RUNTIME_PLAN_ENDPOINT = '/runtime-plan';
export const AGENT_GATEWAY_ENDPOINT = '/agent-gateway';
export const RUNTIME_SESSION_BASE = '/runtime/session';
export const AGENT_MARKDOWN_ENDPOINT = '/agent-markdown';

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const isValidationIssue = (value: unknown): value is ValidationIssue =>
  isRecord(value)
  && typeof value.code === 'string'
  && Array.isArray(value.path)
  && value.path.every((entry) => typeof entry === 'string')
  && typeof value.message === 'string';

export const isSchemaIssue = (value: unknown): value is SchemaIssue =>
  isRecord(value)
  && typeof value.code === 'string'
  && Array.isArray(value.path)
  && value.path.every((entry) => typeof entry === 'string')
  && typeof value.message === 'string';

const formatIssuePath = (path: readonly string[]): string => (path.length === 0 ? 'root' : path.join('.'));

const formatValidationIssue = (issue: ValidationIssue): string => `${formatIssuePath(issue.path)}: ${issue.message}`;

export const formatFailurePayload = (payload: unknown, fallback: string): string => {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    if (Array.isArray(payload.error.issues)) {
      const formattedIssues = payload.error.issues.filter(isValidationIssue).map(formatValidationIssue).join('\n');

      return formattedIssues || payload.error.message;
    }

    return payload.error.message;
  }

  if (Array.isArray(payload.issues)) {
    return payload.issues.filter(isValidationIssue).map(formatValidationIssue).join('\n') || fallback;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return fallback;
};

export const unwrapEnvelope = <TValue>(payload: unknown): TValue => {
  if (!isRecord(payload) || payload.ok !== true || !('data' in payload)) {
    return payload as TValue;
  }

  return payload.data as TValue;
};

export const toAgentMarkdownValidationFailure = <TResponse>(payload: unknown): TResponse | null => {
  if (!isRecord(payload) || payload.ok !== false || !isRecord(payload.error) || !Array.isArray(payload.error.issues)) {
    return null;
  }

  return {
    ok: false,
    issues: payload.error.issues.filter(isSchemaIssue),
  } as TResponse;
};

const toSuccessPayload = <TValue>(payload: unknown): TValue | null => {
  if (!isRecord(payload) || payload.ok !== true || !('data' in payload)) {
    return null;
  }

  return payload.data as TValue;
};

export const toAgentMarkdownFileResponse = (payload: unknown): AgentMarkdownFileResponse => {
  const success = toSuccessPayload<AgentMarkdownFile>(payload);

  if (success !== null) {
    return { ok: true, value: success };
  }

  return payload as AgentMarkdownFileResponse;
};

export const toAgentMarkdownValidationResponse = (payload: unknown): AgentMarkdownValidationResponse => {
  const success = toSuccessPayload<AgentMarkdownValidationDetails>(payload);

  if (success !== null) {
    return { ok: true, value: success };
  }

  return payload as AgentMarkdownValidationResponse;
};

export const toAgentMarkdownDeleteResponse = (payload: unknown): AgentMarkdownDeleteResponse => {
  const success = toSuccessPayload<{ readonly path: string }>(payload);

  if (success !== null) {
    return { ok: true, value: success };
  }

  return payload as AgentMarkdownDeleteResponse;
};

export const getErrorPayload = (result: { readonly error?: { readonly data?: unknown } }): unknown => result.error?.data;

export const createCustomError = (payload: unknown, fallback: string) => ({
  status: 'CUSTOM_ERROR' as const,
  error: formatFailurePayload(payload, fallback),
  data: payload,
});

export const toRuntimeTaskPayload = (task: RuntimeTaskDraft): RuntimeTaskDraft['constraints'] extends string ? {
  readonly title: string;
  readonly goal: string;
  readonly constraints: readonly string[];
} : never => ({
  title: task.title,
  goal: task.goal,
  constraints: task.constraints
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0),
});

export const formatApiErrorMessage = (error: unknown, fallback: string): string => {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  if (isRecord(error) && typeof error.error === 'string') {
    return error.error;
  }

  if (isRecord(error) && 'data' in error) {
    return formatFailurePayload(error.data, fallback);
  }

  return fallback;
};
