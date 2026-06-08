import { del, put } from '@vercel/blob';

import type { ValidationResult } from '../domain/base';
import type { AgentMarkdownFileSummary } from '../agent/markdown';
import {
  createAgentMarkdownFileSummary,
  fail,
  markdownIssue,
  normalizeAgentMarkdownPath,
  ok,
  validateAgentMarkdownContent,
} from '../agent/markdown';
import type { AgentMarkdownAdapter } from './agentMarkdownAdapter';
import {
  createAgentMarkdownMetadataInput,
  type AgentMarkdownMetadataRecord,
  type AgentMarkdownMetadataRepository,
} from './agentMarkdownMetadataRepository';

export type VercelBlobAgentMarkdownAdapterOptions = {
  readonly metadataRepository: AgentMarkdownMetadataRepository;
  readonly blobPrefix?: string;
};

const DEFAULT_BLOB_PREFIX = 'agents';

const normalizeBlobPrefix = (value: string | undefined): string => {
  if (value === undefined) {
    return DEFAULT_BLOB_PREFIX;
  }

  return value.replace(/^\/+|\/+$/g, '');
};

const createBlobPath = (blobPrefix: string, relativePath: string): string => {
  if (blobPrefix.length === 0) {
    return relativePath;
  }

  return `${blobPrefix}/${relativePath}`;
};

const readBlobText = async (storagePath: string, relativePath: string): Promise<ValidationResult<{ readonly content: string }>> => {
  const response = await fetch(storagePath);

  if (response.status === 404) {
    return fail([
      markdownIssue('file_missing', ['path'], `Markdown Blob 不存在：${relativePath}`),
    ]);
  }

  if (!response.ok) {
    return fail([
      markdownIssue('blob_read_failed', ['path'], `读取 Markdown Blob 失败：${response.status} ${response.statusText}`),
    ]);
  }

  return ok({ content: await response.text() });
};

const createSummaryFromRecord = async (
  record: AgentMarkdownMetadataRecord,
): Promise<ValidationResult<AgentMarkdownFileSummary>> => {
  const contentResult = await readBlobText(record.storagePath, record.path);

  if (!contentResult.ok) {
    return fail(contentResult.issues);
  }

  return ok(createAgentMarkdownFileSummary({
    relativePath: record.path,
    content: contentResult.value.content,
    size: Buffer.byteLength(contentResult.value.content, 'utf8'),
    updatedAt: record.updatedAt,
  }));
};

export const createVercelBlobAgentMarkdownAdapter = ({
  metadataRepository,
  blobPrefix,
}: VercelBlobAgentMarkdownAdapterOptions): AgentMarkdownAdapter => {
  const normalizedBlobPrefix = normalizeBlobPrefix(blobPrefix);

  return {
    list: async () => {
      const records = await metadataRepository.listByProvider('vercel_blob');
      const results = await Promise.all(records.map(createSummaryFromRecord));

      return results.flatMap((result) => (result.ok ? [result.value] : []));
    },
    read: async (candidatePath) => {
      const normalizedPath = normalizeAgentMarkdownPath(candidatePath);

      if (!normalizedPath.ok) {
        return fail(normalizedPath.issues);
      }

      const record = await metadataRepository.findByPath(normalizedPath.value.relativePath);

      if (record === undefined || record.storageProvider !== 'vercel_blob') {
        return fail([
          markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${normalizedPath.value.relativePath}`),
        ]);
      }

      const contentResult = await readBlobText(record.storagePath, normalizedPath.value.relativePath);

      if (!contentResult.ok) {
        return fail(contentResult.issues);
      }

      const summary = createAgentMarkdownFileSummary({
        relativePath: normalizedPath.value.relativePath,
        content: contentResult.value.content,
        size: Buffer.byteLength(contentResult.value.content, 'utf8'),
        updatedAt: record.updatedAt,
      });

      return ok({ ...summary, content: contentResult.value.content });
    },
    validate: (candidatePath, content) => {
      const normalizedPath = normalizeAgentMarkdownPath(candidatePath);

      if (!normalizedPath.ok) {
        return fail(normalizedPath.issues);
      }

      return validateAgentMarkdownContent(normalizedPath.value.relativePath, content);
    },
    write: async ({ path, content, mode }) => {
      const normalizedPath = normalizeAgentMarkdownPath(path);

      if (!normalizedPath.ok) {
        return fail(normalizedPath.issues);
      }

      const validation = validateAgentMarkdownContent(normalizedPath.value.relativePath, content);

      if (!validation.ok) {
        return fail(validation.issues);
      }

      const existingRecord = await metadataRepository.findByPath(normalizedPath.value.relativePath);

      if (mode === 'create' && existingRecord !== undefined) {
        return fail([
          markdownIssue('file_conflict', ['path'], `Markdown 文件已存在：${normalizedPath.value.relativePath}`),
        ]);
      }

      if (mode === 'update' && existingRecord?.storageProvider !== 'vercel_blob') {
        return fail([
          markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${normalizedPath.value.relativePath}`),
        ]);
      }

      const blob = await put(createBlobPath(normalizedBlobPrefix, normalizedPath.value.relativePath), content, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'text/markdown; charset=utf-8',
      });
      const summary = createAgentMarkdownFileSummary({
        relativePath: normalizedPath.value.relativePath,
        content,
        size: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date().toISOString(),
      });

      await metadataRepository.upsert(
        createAgentMarkdownMetadataInput({
          summary,
          storageProvider: 'vercel_blob',
          storagePath: blob.url,
        }),
      );

      return ok({ ...summary, content });
    },
    delete: async (candidatePath) => {
      const normalizedPath = normalizeAgentMarkdownPath(candidatePath);

      if (!normalizedPath.ok) {
        return fail(normalizedPath.issues);
      }

      const record = await metadataRepository.findByPath(normalizedPath.value.relativePath);

      if (record === undefined || record.storageProvider !== 'vercel_blob') {
        return fail([
          markdownIssue('file_missing', ['path'], `Markdown 文件不存在：${normalizedPath.value.relativePath}`),
        ]);
      }

      await del(record.storagePath);
      await metadataRepository.delete(normalizedPath.value.relativePath);

      return ok({ path: normalizedPath.value.relativePath });
    },
  };
};