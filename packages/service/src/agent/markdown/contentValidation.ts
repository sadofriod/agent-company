import type { ValidationResult } from '../../domain/base';
import type {
  AgentMarkdownFrontMatter,
  AgentMarkdownValidationDetails,
} from './types';
import { fail, markdownIssue, ok } from './result';
import { parseAgentMarkdownFrontMatter } from './frontMatter';

const normalizeMarkdownNewlines = (content: string): string => content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const isSystemMarkdownPath = (relativePath: string): boolean => relativePath === 'system.md';

const createValidationDetails = (
  hasFrontMatter: boolean,
  body: string,
  frontMatter?: AgentMarkdownFrontMatter,
): AgentMarkdownValidationDetails => {
  if (frontMatter === undefined) {
    return { hasFrontMatter, body };
  }

  return { hasFrontMatter, body, frontMatter };
};

export const validateAgentMarkdownContent = (
  relativePath: string,
  content: string,
): ValidationResult<AgentMarkdownValidationDetails> => {
  const normalizedContent = normalizeMarkdownNewlines(content);

  if (normalizedContent.trim().length === 0) {
    return fail([
      markdownIssue('markdown_empty', ['content'], 'Markdown 内容不能为空。'),
    ]);
  }

  if (!normalizedContent.startsWith('---\n')) {
    if (isSystemMarkdownPath(relativePath)) {
      return ok(createValidationDetails(false, normalizedContent));
    }

    return fail([
      markdownIssue('front_matter_required', ['content'], 'Agent Markdown 必须以 YAML front matter 开头。'),
    ]);
  }

  const lines = normalizedContent.split('\n');
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');

  if (closingIndex === -1) {
    return fail([
      markdownIssue('front_matter_invalid', ['content'], 'YAML front matter 缺少结束分隔符 ---。'),
    ]);
  }

  const rawFrontMatter = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');

  if (rawFrontMatter.trim().length === 0) {
    return fail([
      markdownIssue('front_matter_invalid', ['frontMatter'], 'YAML front matter 不能为空。'),
    ]);
  }

  if (body.trim().length === 0) {
    return fail([
      markdownIssue('markdown_body_required', ['content'], 'Markdown 正文不能为空。'),
    ]);
  }

  const parsedFrontMatter = parseAgentMarkdownFrontMatter(rawFrontMatter);

  if (!parsedFrontMatter.ok) {
    return fail(parsedFrontMatter.issues);
  }

  return ok(createValidationDetails(true, body, parsedFrontMatter.value));
};