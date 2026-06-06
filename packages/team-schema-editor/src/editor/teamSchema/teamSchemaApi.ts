import type { TeamSchemaDocument, ValidationIssue } from '../model/types';

const TEAM_SCHEMA_ENDPOINT = '/team/schema';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isValidationIssue = (value: unknown): value is ValidationIssue =>
  isRecord(value)
  && Array.isArray(value.path)
  && value.path.every((entry) => typeof entry === 'string')
  && typeof value.message === 'string';

const formatIssuePath = (path: readonly string[]): string => (path.length === 0 ? 'root' : path.join('.'));

const formatIssue = (issue: ValidationIssue): string => `${formatIssuePath(issue.path)}: ${issue.message}`;

const formatFailurePayload = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return 'Unable to load team schema.';
  }

  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    if (Array.isArray(payload.error.issues)) {
      return payload.error.issues.filter(isValidationIssue).map(formatIssue).join('\n') || payload.error.message;
    }

    return payload.error.message;
  }

  if (Array.isArray(payload.issues)) {
    return payload.issues.filter(isValidationIssue).map(formatIssue).join('\n');
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return 'Unable to load team schema.';
};

const readResponsePayload = async (response: Response): Promise<unknown> => {
  try {
    return await response.json() as unknown;
  } catch (_error) {
    return null;
  }
};

export const loadTeamSchemaFromService = async (): Promise<TeamSchemaDocument> => {
  const response = await fetch(TEAM_SCHEMA_ENDPOINT);
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(formatFailurePayload(payload));
  }

  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.data) || !isRecord(payload.data.schema)) {
    throw new Error(formatFailurePayload(payload));
  }

  return payload.data.schema as TeamSchemaDocument;
};