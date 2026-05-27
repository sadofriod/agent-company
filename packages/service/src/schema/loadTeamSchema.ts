import type { ValidationResult } from '../domain/base';
import type { TeamDefinition } from '../domain/organization';
import { teamSchema } from './teamDefinitionSchema';
import { issue, mapZodIssue } from './teamSchemaShared';
import { validateTeamReferences } from './teamReferenceValidation';

export { validateTeamReferences } from './teamReferenceValidation';

export const loadTeamSchema = (input: string | unknown): ValidationResult<TeamDefinition> => {
  const rawValue: unknown =
    typeof input === 'string'
      ? (() => {
          try {
            return JSON.parse(input) as unknown;
          } catch {
            return undefined;
          }
        })()
      : input;

  if (rawValue === undefined) {
    return {
      ok: false,
      issues: [issue('schema_invalid', [], '输入不是合法 JSON。', '请检查 JSON 语法。')],
    };
  }

  const parsedTeam = teamSchema.safeParse(rawValue);
  if (!parsedTeam.success) {
    return {
      ok: false,
      issues: parsedTeam.error.issues.map(mapZodIssue),
    };
  }

  return validateTeamReferences(parsedTeam.data);
};