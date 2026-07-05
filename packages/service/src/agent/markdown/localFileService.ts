import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ValidationResult } from '../../domain/base';
import { AgentMarkdownWriteMode } from './types';
import type { AgentMarkdownFile, AgentMarkdownFileSummary, AgentMarkdownValidationDetails } from './types';
import { validateAgentMarkdownContent } from './contentValidation';
import { createDefaultAgentsDirectory, resolveAgentMarkdownPath } from './path';
import { fail, markdownIssue, ok } from './result';
import { createAgentMarkdownFileSummary, type AgentMarkdownFileSnapshot } from './summary';

const isMissingFileError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const readAgentMarkdownSnapshot = async (
  agentsDirectory: string,
  relativePath: string,
): Promise<AgentMarkdownFileSnapshot> => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, relativePath);

  if (!resolvedPath.ok) {
    throw new Error(`Invalid repository markdown path: ${relativePath}`);
  }

  const [content, fileStat] = await Promise.all([
    readFile(resolvedPath.value.absolutePath, 'utf8'),
    stat(resolvedPath.value.absolutePath),
  ]);

  return {
    relativePath: resolvedPath.value.relativePath,
    content,
    size: fileStat.size,
    updatedAt: fileStat.mtime.toISOString(),
  };
};

const readAgentMarkdownSummary = async (
  agentsDirectory: string,
  relativePath: string,
): Promise<AgentMarkdownFileSummary> =>
  createAgentMarkdownFileSummary(await readAgentMarkdownSnapshot(agentsDirectory, relativePath));

const listMarkdownPaths = async (rootDirectory: string, currentDirectory = rootDirectory): Promise<readonly string[]> => {
  const entries = await readdir(currentDirectory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absoluteEntryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownPaths(rootDirectory, absoluteEntryPath);
      }

      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        return [];
      }

      return [path.relative(rootDirectory, absoluteEntryPath).split(path.sep).join('/')];
    }),
  );

  return paths.flat().sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
};

const fileExists = async (absolutePath: string): Promise<boolean> =>
  stat(absolutePath).then(
    () => true,
    (error: unknown) => {
      if (isMissingFileError(error)) {
        return false;
      }

      throw error;
    },
  );

export const listAgentMarkdownFiles = async (
  agentsDirectory = createDefaultAgentsDirectory(),
): Promise<readonly AgentMarkdownFileSummary[]> => {
  const rootDirectory = path.resolve(agentsDirectory);
  const markdownPaths = await listMarkdownPaths(rootDirectory);
  const summaries = await Promise.all(
    markdownPaths.map((relativePath) => readAgentMarkdownSummary(rootDirectory, relativePath)),
  );

  return summaries.sort((leftFile, rightFile) => leftFile.path.localeCompare(rightFile.path));
};

export const readAgentMarkdownFile = async (
  candidatePath: string,
  agentsDirectory = createDefaultAgentsDirectory(),
): Promise<ValidationResult<AgentMarkdownFile>> => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, candidatePath);

  if (!resolvedPath.ok) {
    return fail(resolvedPath.issues);
  }

  try {
    const snapshot = await readAgentMarkdownSnapshot(agentsDirectory, resolvedPath.value.relativePath);
    const summary = createAgentMarkdownFileSummary(snapshot);

    return ok({ ...summary, content: snapshot.content });
  } catch (error) {
    if (isMissingFileError(error)) {
      return fail([
        markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${resolvedPath.value.relativePath}`),
      ]);
    }

    throw error;
  }
};

export const validateAgentMarkdownFileDraft = (
  candidatePath: string,
  content: string,
  agentsDirectory = createDefaultAgentsDirectory(),
): ValidationResult<AgentMarkdownValidationDetails> => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, candidatePath);

  if (!resolvedPath.ok) {
    return fail(resolvedPath.issues);
  }

  return validateAgentMarkdownContent(resolvedPath.value.relativePath, content);
};

export const writeAgentMarkdownFile = async (
  candidatePath: string,
  content: string,
  mode: AgentMarkdownWriteMode,
  agentsDirectory = createDefaultAgentsDirectory(),
): Promise<ValidationResult<AgentMarkdownFile>> => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, candidatePath);

  if (!resolvedPath.ok) {
    return fail(resolvedPath.issues);
  }

  const validation = validateAgentMarkdownContent(resolvedPath.value.relativePath, content);

  if (!validation.ok) {
    return fail(validation.issues);
  }

  const exists = await fileExists(resolvedPath.value.absolutePath);

  if (mode === AgentMarkdownWriteMode.Create && exists) {
    return fail([
      markdownIssue('file_conflict', ['path'], `Markdown 文件已存在：${resolvedPath.value.relativePath}`),
    ]);
  }

  if (mode === AgentMarkdownWriteMode.Update && !exists) {
    return fail([
      markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${resolvedPath.value.relativePath}`),
    ]);
  }

  await mkdir(path.dirname(resolvedPath.value.absolutePath), { recursive: true });
  await writeFile(resolvedPath.value.absolutePath, content, 'utf8');

  return readAgentMarkdownFile(resolvedPath.value.relativePath, agentsDirectory);
};

export const deleteAgentMarkdownFile = async (
  candidatePath: string,
  agentsDirectory = createDefaultAgentsDirectory(),
): Promise<ValidationResult<{ readonly path: string }>> => {
  const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, candidatePath);

  if (!resolvedPath.ok) {
    return fail(resolvedPath.issues);
  }

  const fileStat = await stat(resolvedPath.value.absolutePath).then(
    (value) => value,
    (error: unknown) => {
      if (isMissingFileError(error)) {
        return undefined;
      }

      throw error;
    },
  );

  if (fileStat === undefined || !fileStat.isFile()) {
    return fail([
      markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${resolvedPath.value.relativePath}`),
    ]);
  }

  await rm(resolvedPath.value.absolutePath);

  return ok({ path: resolvedPath.value.relativePath });
};