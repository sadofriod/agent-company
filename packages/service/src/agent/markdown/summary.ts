import path from 'node:path';

import type { AgentMarkdownFileSummary } from './types';
import { validateAgentMarkdownContent } from './contentValidation';

export type AgentMarkdownFileSnapshot = {
  readonly relativePath: string;
  readonly content: string;
  readonly size: number;
  readonly updatedAt: string;
};

export const createAgentMarkdownFileSummary = (
  snapshot: AgentMarkdownFileSnapshot,
): AgentMarkdownFileSummary => {
  const validation = validateAgentMarkdownContent(snapshot.relativePath, snapshot.content);
  const frontMatterName = validation.ok ? validation.value.frontMatter?.name : undefined;
  const baseName = path.basename(snapshot.relativePath, '.md');
  const directoryName = path.posix.dirname(snapshot.relativePath);

  return {
    path: snapshot.relativePath,
    name: typeof frontMatterName === 'string' ? frontMatterName : baseName,
    category: directoryName === '.' ? 'root' : directoryName,
    size: snapshot.size,
    updatedAt: snapshot.updatedAt,
    validation,
  };
};