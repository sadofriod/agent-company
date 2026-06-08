import 'dotenv/config';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Prisma } from '@prisma/client';

import {
  createAgentMarkdownMetadataInput,
  createPrismaAgentMarkdownMetadataRepository,
} from '../src/adapter/agentMarkdownMetadataRepository';
import { getPrismaClient } from '../src/adapter/prismaClient';
import { createPrismaTeamSchemaRepository } from '../src/adapter/teamSchemaRepository';
import { listAgentMarkdownFiles, resolveAgentMarkdownPath } from '../src/agent/markdown';

const TEAM_SCHEMA_KEY = 'current';

const readDefaultTeamSchema = async (): Promise<Prisma.InputJsonValue> => {
  const schemaPath = path.resolve(process.cwd(), '../../docs/examples/software-delivery-team.json');
  const content = await readFile(schemaPath, 'utf8');

  return JSON.parse(content) as Prisma.InputJsonValue;
};

const seedTeamSchema = async (): Promise<void> => {
  const repository = createPrismaTeamSchemaRepository(getPrismaClient());
  const document = await readDefaultTeamSchema();

  await repository.upsert({ key: TEAM_SCHEMA_KEY, document });

  console.log('[seed] team schema initialized with key "current"');
};

const seedAgentMarkdownMetadata = async (): Promise<void> => {
  const prisma = getPrismaClient();
  const repository = createPrismaAgentMarkdownMetadataRepository(prisma);
  const agentsDirectory = path.resolve(process.cwd(), '../agents');
  const files = await listAgentMarkdownFiles(agentsDirectory);

  await Promise.all(
    files.map(async (summary) => {
      const resolvedPath = resolveAgentMarkdownPath(agentsDirectory, summary.path);
      const storagePath = resolvedPath.ok ? resolvedPath.value.absolutePath : summary.path;

      await repository.upsert(
        createAgentMarkdownMetadataInput({
          summary,
          storageProvider: 'local',
          storagePath,
        }),
      );
    }),
  );

  console.log(`[seed] agent markdown metadata initialized: ${files.length} rows`);
};

const main = async (): Promise<void> => {
  await seedTeamSchema();
  await seedAgentMarkdownMetadata();

  await getPrismaClient().$disconnect();
};

void main().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';

  console.error(`[seed] failed: ${message}`);

  try {
    await getPrismaClient().$disconnect();
  } catch {
    // ignore disconnect errors during failure handling
  }

  process.exitCode = 1;
});
