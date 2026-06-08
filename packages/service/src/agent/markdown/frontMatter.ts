import { z } from 'zod';
import { parseDocument } from 'yaml';

import type { SchemaIssue, ValidationResult } from '../../domain/base';
import type { AgentMarkdownFrontMatter } from './types';
import { fail, markdownIssue, ok } from './result';

const AGENT_MARKDOWN_LIST_FIELDS = [
  'partials',
  'tools',
  'allowed_commands',
  'required_commands',
] as const;

const AGENT_MARKDOWN_SCALAR_FIELDS = [
  'name',
  'description',
  'profile',
  'tool_policy',
] as const;

const agentMarkdownListFields = new Set<string>(AGENT_MARKDOWN_LIST_FIELDS);
const agentMarkdownScalarFields = new Set<string>(AGENT_MARKDOWN_SCALAR_FIELDS);

const frontMatterValueSchema = z.union([
  z.string().min(1, '字段必须是非空字符串。'),
  z.array(z.string().min(1, '列表项必须是非空字符串。')),
]);

const frontMatterSchema = z.record(frontMatterValueSchema).superRefine((metadata, context) => {
  for (const field of AGENT_MARKDOWN_SCALAR_FIELDS) {
    const value = metadata[field];

    if (value !== undefined && typeof value !== 'string') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: '字段必须是字符串。',
      });
    }
  }

  for (const field of AGENT_MARKDOWN_LIST_FIELDS) {
    const value = metadata[field];

    if (value !== undefined && !Array.isArray(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: '字段必须是字符串数组。',
      });
    }
  }

  if (typeof metadata.name !== 'string') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['name'],
      message: 'Agent front matter 必须包含 name。',
    });
  }

  if (typeof metadata.description !== 'string') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['description'],
      message: 'Agent front matter 必须包含 description。',
    });
  }

  for (const [field, value] of Object.entries(metadata)) {
    if (agentMarkdownScalarFields.has(field) || agentMarkdownListFields.has(field)) {
      continue;
    }

    if (typeof value !== 'string' && !Array.isArray(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: '自定义字段只能是字符串或字符串数组。',
      });
    }
  }
});

const mapZodIssue = (entry: z.ZodIssue): SchemaIssue =>
  markdownIssue('front_matter_invalid', ['frontMatter', ...entry.path.map(String)], entry.message);

export const parseAgentMarkdownFrontMatter = (rawFrontMatter: string): ValidationResult<AgentMarkdownFrontMatter> => {
  const document = parseDocument(rawFrontMatter, { prettyErrors: false });
  const syntaxIssues = [...document.errors, ...document.warnings].map((entry) =>
    markdownIssue('front_matter_invalid', ['frontMatter'], entry.message),
  );

  if (syntaxIssues.length > 0) {
    return fail(syntaxIssues);
  }

  const metadataValue: unknown = document.toJS();
  const parsedMetadata = frontMatterSchema.safeParse(metadataValue);

  if (!parsedMetadata.success) {
    return fail(parsedMetadata.error.issues.map(mapZodIssue));
  }

  return ok(parsedMetadata.data);
};