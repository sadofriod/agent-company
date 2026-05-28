import type { TeamSchemaDocument, ValidationIssue } from '../model/types';

const TEAM_SCHEMA_ENDPOINT = '/team/schema';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const formatIssuePath = (path: readonly string[]): string => (path.length === 0 ? 'root' : path.join('.'));

const formatIssue = (issue: ValidationIssue): string => `${formatIssuePath(issue.path)}: ${issue.message}`;

const formatFailurePayload = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return 'Unable to load team schema.';
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload.issues)) {
    return (payload.issues as ValidationIssue[]).map(formatIssue).join('\n');
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

  if (!isRecord(payload) || payload.ok !== true || !isRecord(payload.schema)) {
    throw new Error(formatFailurePayload(payload));
  }

  return payload.schema as TeamSchemaDocument;
};