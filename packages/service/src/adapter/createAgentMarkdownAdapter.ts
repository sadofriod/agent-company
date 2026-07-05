import type { PrismaClient } from '@prisma/client';

import { AgentMarkdownStorageProvider, type AgentMarkdownAdapter } from './agentMarkdownAdapter';
import { createPrismaAgentMarkdownMetadataRepository } from './agentMarkdownMetadataRepository';
import { createLocalAgentMarkdownAdapter } from './localAgentMarkdownAdapter';
import { getPrismaClient } from './prismaClient';
import { createVercelBlobAgentMarkdownAdapter } from './vercelBlobAgentMarkdownAdapter';

export type CreateAgentMarkdownAdapterOptions = {
  readonly agentsDirectory?: string;
  readonly blobPrefix?: string;
  readonly prisma?: PrismaClient;
  readonly storageProvider?: AgentMarkdownStorageProvider;
};

const resolveDefaultStorageProvider = (): AgentMarkdownStorageProvider => {
  if (process.env.NODE_ENV === 'production') {
    return AgentMarkdownStorageProvider.VercelBlob;
  }

  return AgentMarkdownStorageProvider.Local;
};

const parseStorageProvider = (value: string | undefined): AgentMarkdownStorageProvider => {
  if (value === AgentMarkdownStorageProvider.Local || value === AgentMarkdownStorageProvider.VercelBlob) {
    return value;
  }

  return resolveDefaultStorageProvider();
};

export const createAgentMarkdownAdapter = (
  options: CreateAgentMarkdownAdapterOptions = {},
): AgentMarkdownAdapter => {
  const prisma = options.prisma ?? getPrismaClient();
  const metadataRepository = createPrismaAgentMarkdownMetadataRepository(prisma);
  const storageProvider = options.storageProvider ?? parseStorageProvider(process.env.AGENT_MARKDOWN_STORAGE);
  const blobPrefix = options.blobPrefix ?? process.env.AGENT_MARKDOWN_BLOB_PREFIX;

  if (storageProvider === AgentMarkdownStorageProvider.VercelBlob) {
    return createVercelBlobAgentMarkdownAdapter({ metadataRepository, blobPrefix });
  }

  return createLocalAgentMarkdownAdapter({
    agentsDirectory: options.agentsDirectory,
    metadataRepository,
  });
};