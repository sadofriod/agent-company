import type { SchemaIssue, ValidationResult } from '../../domain/base';

export const ok = <TValue>(value: TValue): ValidationResult<TValue> => ({ ok: true, value });

export const fail = <TValue>(issues: readonly SchemaIssue[]): ValidationResult<TValue> => ({ ok: false, issues });

export const markdownIssue = (
  code: string,
  issuePath: readonly string[],
  message: string,
  suggestion?: string,
): SchemaIssue => {
  const baseIssue = { code, path: issuePath, message };

  if (suggestion === undefined) {
    return baseIssue;
  }

  return { ...baseIssue, suggestion };
};