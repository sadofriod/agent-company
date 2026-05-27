import { z } from 'zod';

import type { SchemaIssue } from '../domain/base';
import {
  CONFLICT_RESOLUTION,
  DISCUSSION_MODE,
  INDEXED_OBJECT_TYPE,
  MEMORY_CONFLICT_STRATEGY,
  MEMORY_SCOPE,
  RETRIEVAL_MODE,
} from '../domain/organization';
import { REVIEW_STATUS, REVIEWER_KIND } from '../domain/review';

export const issue = (
  code: string,
  path: readonly string[],
  message: string,
  suggestion?: string,
): SchemaIssue => ({ code, path, message, suggestion });

const toEnumValues = <TValue extends string>(
  values: readonly TValue[],
): [TValue, ...TValue[]] => {
  const [firstValue, ...otherValues] = values;

  if (firstValue === undefined) {
    throw new Error('枚举值不能为空。');
  }

  return [firstValue, ...otherValues];
};

export const nonEmptyStringSchema = z.string().min(1, '字段必须是非空字符串。');
export const stringArraySchema = z.array(nonEmptyStringSchema);
export const integerSchema = z.number().int('字段必须是整数。');

export const discussionModeSchema = z.enum(toEnumValues(Object.values(DISCUSSION_MODE)));
export const conflictResolutionSchema = z.enum(
  toEnumValues(Object.values(CONFLICT_RESOLUTION)),
);
export const retrievalModeSchema = z.enum(toEnumValues(Object.values(RETRIEVAL_MODE)));
export const memoryConflictStrategySchema = z.enum(
  toEnumValues(Object.values(MEMORY_CONFLICT_STRATEGY)),
);
export const memoryScopeSchema = z.enum(toEnumValues(Object.values(MEMORY_SCOPE)));
export const indexedObjectTypeSchema = z.enum(toEnumValues(Object.values(INDEXED_OBJECT_TYPE)));
export const reviewerKindSchema = z.enum(toEnumValues(Object.values(REVIEWER_KIND)));
export const reviewStatusSchema = z.enum(toEnumValues(Object.values(REVIEW_STATUS)));
export const evidenceRequiredOutputSchema = z.enum([
  'decision',
  'ticket',
  'handoff',
  'review_result',
]);

export const mapZodIssue = (entry: z.ZodIssue): SchemaIssue =>
  issue('schema_invalid', entry.path.map(String), entry.message);