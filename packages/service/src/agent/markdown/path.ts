import path from 'node:path';

import type { ValidationResult } from '../../domain/base';
import { fail, markdownIssue, ok } from './result';

export type NormalizedAgentMarkdownPath = {
  readonly relativePath: string;
};

export type ResolvedAgentMarkdownPath = {
  readonly relativePath: string;
  readonly absolutePath: string;
};

export const createDefaultAgentsDirectory = (): string => path.resolve(process.cwd(), '../agents');

export const normalizeAgentMarkdownPath = (candidatePath: string): ValidationResult<NormalizedAgentMarkdownPath> => {
  const rawPath = candidatePath.trim();

  if (rawPath.length === 0) {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径不能为空。', '请输入相对 agents 目录的 .md 路径。'),
    ]);
  }

  if (rawPath.includes('\\')) {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径必须使用 / 分隔。', '例如 engineering/FullStackEngineer.md。'),
    ]);
  }

  if (path.isAbsolute(rawPath) || rawPath.includes(':')) {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径必须是相对路径。'),
    ]);
  }

  const relativePath = path.posix.normalize(rawPath);

  if (relativePath === '.' || relativePath.startsWith('../') || relativePath === '..') {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径不能离开 agents 目录。'),
    ]);
  }

  if (!relativePath.endsWith('.md')) {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径必须以 .md 结尾。'),
    ]);
  }

  return ok({ relativePath });
};

export const resolveAgentMarkdownPath = (
  agentsDirectory: string,
  candidatePath: string,
): ValidationResult<ResolvedAgentMarkdownPath> => {
  const normalizedPath = normalizeAgentMarkdownPath(candidatePath);

  if (!normalizedPath.ok) {
    return fail(normalizedPath.issues);
  }

  const { relativePath } = normalizedPath.value;

  const rootDirectory = path.resolve(agentsDirectory);
  const absolutePath = path.resolve(rootDirectory, relativePath);
  const rootRelativePath = path.relative(rootDirectory, absolutePath);

  if (rootRelativePath.startsWith('..') || path.isAbsolute(rootRelativePath)) {
    return fail([
      markdownIssue('path_invalid', ['path'], 'Markdown 路径不能离开 agents 目录。'),
    ]);
  }

  return ok({ relativePath, absolutePath });
};