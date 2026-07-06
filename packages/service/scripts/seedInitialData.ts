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
const DEFAULT_TEAM_SCHEMA_FILE = 'discussion-blackboard-team.json';
const DEFAULT_EXAMPLE_TEAM_NAME = 'MVP RAG Memory Tool Call Team';
const TEAM_SCHEMA_FIXTURES = [
  { key: TEAM_SCHEMA_KEY, fileName: DEFAULT_TEAM_SCHEMA_FILE },
  { key: 'discussion-blackboard-team', fileName: DEFAULT_TEAM_SCHEMA_FILE },
  { key: 'software-delivery-team', fileName: 'software-delivery-team.json' },
  { key: 'mvp-rag-memory-toolcall-team', fileName: 'mvp-rag-memory-toolcall-team.json' },
  {
    key: 'mvp-sequential-handoff-team',
    fileName: 'mvp-rag-memory-toolcall-team.json',
    derivedMode: 'sequential_handoff',
    teamId: 'mvp-sequential-handoff-team',
    teamName: `${DEFAULT_EXAMPLE_TEAM_NAME} · Sequential Handoff`,
    conflictResolution: 'owner_decision',
  },
  {
    key: 'mvp-parallel-review-team',
    fileName: 'mvp-rag-memory-toolcall-team.json',
    derivedMode: 'parallel_review',
    teamId: 'mvp-parallel-review-team',
    teamName: `${DEFAULT_EXAMPLE_TEAM_NAME} · Parallel Review`,
    conflictResolution: 'block_and_escalate',
  },
] as const;

const readTeamSchemaFixture = async (fileName: string): Promise<Prisma.InputJsonValue> => {
  const schemaPath = path.resolve(process.cwd(), `../../docs/examples/${fileName}`);
  const content = await readFile(schemaPath, 'utf8');

  return JSON.parse(content) as Prisma.InputJsonValue;
};

const readDerivedTeamSchemaFixture = async ({
  fileName,
  derivedMode,
  teamId,
  teamName,
  conflictResolution,
}: {
  fileName: string;
  derivedMode: 'sequential_handoff' | 'parallel_review';
  teamId: string;
  teamName: string;
  conflictResolution: 'owner_decision' | 'block_and_escalate';
}): Promise<Prisma.InputJsonValue> => {
  const document = await readTeamSchemaFixture(fileName);

  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    return document;
  }

  const schemaRecord = document as Record<string, unknown>;
  const discussionPolicy =
    typeof schemaRecord.discussion_policy === 'object'
    && schemaRecord.discussion_policy !== null
    && !Array.isArray(schemaRecord.discussion_policy)
      ? (schemaRecord.discussion_policy as Record<string, unknown>)
      : {};
  const agents = Array.isArray(schemaRecord.agents)
    ? schemaRecord.agents.map((agent) => {
      if (typeof agent !== 'object' || agent === null || Array.isArray(agent)) {
        return agent;
      }

      const agentRecord = agent as Record<string, unknown>;
      const metadata =
        typeof agentRecord.metadata === 'object'
        && agentRecord.metadata !== null
        && !Array.isArray(agentRecord.metadata)
          ? (agentRecord.metadata as Record<string, unknown>)
          : undefined;
      const llm =
        metadata !== undefined
        && typeof metadata.llm === 'object'
        && metadata.llm !== null
        && !Array.isArray(metadata.llm)
          ? (metadata.llm as Record<string, unknown>)
          : undefined;
      const headers =
        llm !== undefined
        && typeof llm.headers === 'object'
        && llm.headers !== null
        && !Array.isArray(llm.headers)
          ? (llm.headers as Record<string, unknown>)
          : undefined;

      if (headers?.['x-agent-team'] === undefined) {
        return agent;
      }

      return {
        ...agentRecord,
        metadata: {
          ...metadata,
          llm: {
            ...llm,
            headers: {
              ...headers,
              'x-agent-team': teamId,
            },
          },
        },
      };
    })
    : schemaRecord.agents;
  const restDiscussionPolicy = { ...discussionPolicy };
  delete restDiscussionPolicy.supervisor_agent_id;

  return {
    ...schemaRecord,
    team_id: teamId,
    team_name: teamName,
    agents,
    discussion_policy: {
      ...restDiscussionPolicy,
      mode: derivedMode,
      conflict_resolution: conflictResolution,
    },
  } as Prisma.InputJsonValue;
};

const seedTeamSchema = async (): Promise<void> => {
  const repository = createPrismaTeamSchemaRepository(getPrismaClient());

  await Promise.all(
    TEAM_SCHEMA_FIXTURES.map(async (fixture) => {
      const document = 'derivedMode' in fixture
        ? await readDerivedTeamSchemaFixture(fixture)
        : await readTeamSchemaFixture(fixture.fileName);
      const key = fixture.key;
      await repository.upsert({ key, document });
    }),
  );

  console.log(`[seed] team schema initialized: ${TEAM_SCHEMA_FIXTURES.map(({ key }) => key).join(', ')}`);
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
