import { Prisma, type AgentMarkdown, type PrismaClient } from '@prisma/client';

import type { AgentMarkdownFileSummary, AgentMarkdownFrontMatter } from '../agent/markdown';
import type { AgentMarkdownStorageProvider } from './agentMarkdownAdapter';

export type AgentMarkdownMetadataInput = {
  readonly path: string;
  readonly storageProvider: AgentMarkdownStorageProvider;
  readonly storagePath: string;
  readonly name: string;
  readonly category: string;
  readonly description: string | null;
  readonly profile: string | null;
  readonly toolPolicy: string | null;
  readonly partials: readonly string[];
  readonly tools: readonly string[];
  readonly allowedCommands: readonly string[];
  readonly requiredCommands: readonly string[];
  readonly frontMatter?: AgentMarkdownFrontMatter;
  readonly size: number;
  readonly storageUpdatedAt: Date;
};

export type AgentMarkdownMetadataRecord = {
  readonly path: string;
  readonly storageProvider: AgentMarkdownStorageProvider;
  readonly storagePath: string;
  readonly name: string;
  readonly category: string;
  readonly size: number;
  readonly updatedAt: string;
};

export type AgentMarkdownMetadataRepository = {
  readonly listByProvider: (
    storageProvider: AgentMarkdownStorageProvider,
  ) => Promise<readonly AgentMarkdownMetadataRecord[]>;
  readonly findByPath: (path: string) => Promise<AgentMarkdownMetadataRecord | undefined>;
  readonly upsert: (input: AgentMarkdownMetadataInput) => Promise<AgentMarkdownMetadataRecord>;
  readonly delete: (path: string) => Promise<void>;
};

type CreateAgentMarkdownMetadataInputOptions = {
  readonly summary: AgentMarkdownFileSummary;
  readonly storageProvider: AgentMarkdownStorageProvider;
  readonly storagePath: string;
};

const getScalarFrontMatterValue = (
  frontMatter: AgentMarkdownFrontMatter | undefined,
  key: string,
): string | null => {
  const value = frontMatter?.[key];

  if (typeof value !== 'string') {
    return null;
  }

  return value;
};

const getListFrontMatterValue = (
  frontMatter: AgentMarkdownFrontMatter | undefined,
  key: string,
): readonly string[] => {
  const value = frontMatter?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value;
};

const toPrismaFrontMatter = (
  frontMatter: AgentMarkdownFrontMatter | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (frontMatter === undefined) {
    return Prisma.JsonNull;
  }

  return Object.fromEntries(
    Object.entries(frontMatter).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
};

const createPersistenceData = (input: AgentMarkdownMetadataInput) => ({
  path: input.path,
  storageProvider: input.storageProvider,
  storagePath: input.storagePath,
  name: input.name,
  category: input.category,
  description: input.description,
  profile: input.profile,
  toolPolicy: input.toolPolicy,
  partials: [...input.partials],
  tools: [...input.tools],
  allowedCommands: [...input.allowedCommands],
  requiredCommands: [...input.requiredCommands],
  frontMatter: toPrismaFrontMatter(input.frontMatter),
  size: input.size,
  storageUpdatedAt: input.storageUpdatedAt,
});

const parseStorageProvider = (value: string): AgentMarkdownStorageProvider => {
  if (value === 'vercel_blob') {
    return 'vercel_blob';
  }

  return 'local';
};

const toMetadataRecord = (record: AgentMarkdown): AgentMarkdownMetadataRecord => ({
  path: record.path,
  storageProvider: parseStorageProvider(record.storageProvider),
  storagePath: record.storagePath,
  name: record.name,
  category: record.category,
  size: record.size,
  updatedAt: record.storageUpdatedAt.toISOString(),
});

export const createAgentMarkdownMetadataInput = ({
  summary,
  storageProvider,
  storagePath,
}: CreateAgentMarkdownMetadataInputOptions): AgentMarkdownMetadataInput => {
  const frontMatter = summary.validation.ok ? summary.validation.value.frontMatter : undefined;

  return {
    path: summary.path,
    storageProvider,
    storagePath,
    name: summary.name,
    category: summary.category,
    description: getScalarFrontMatterValue(frontMatter, 'description'),
    profile: getScalarFrontMatterValue(frontMatter, 'profile'),
    toolPolicy: getScalarFrontMatterValue(frontMatter, 'tool_policy'),
    partials: getListFrontMatterValue(frontMatter, 'partials'),
    tools: getListFrontMatterValue(frontMatter, 'tools'),
    allowedCommands: getListFrontMatterValue(frontMatter, 'allowed_commands'),
    requiredCommands: getListFrontMatterValue(frontMatter, 'required_commands'),
    frontMatter,
    size: summary.size,
    storageUpdatedAt: new Date(summary.updatedAt),
  };
};

export const createPrismaAgentMarkdownMetadataRepository = (
  prisma: PrismaClient,
): AgentMarkdownMetadataRepository => ({
  listByProvider: async (storageProvider) => {
    const records = await prisma.agentMarkdown.findMany({
      where: { storageProvider },
      orderBy: { path: 'asc' },
    });

    return records.map(toMetadataRecord);
  },
  findByPath: async (path) => {
    const record = await prisma.agentMarkdown.findUnique({ where: { path } });

    if (record === null) {
      return undefined;
    }

    return toMetadataRecord(record);
  },
  upsert: async (input) => {
    const data = createPersistenceData(input);
    const record = await prisma.agentMarkdown.upsert({
      where: { path: input.path },
      create: data,
      update: data,
    });

    return toMetadataRecord(record);
  },
  delete: async (path) => {
    await prisma.agentMarkdown.deleteMany({ where: { path } });
  },
});