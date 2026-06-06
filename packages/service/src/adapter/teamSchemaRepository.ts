import type { Prisma, PrismaClient, TeamSchema } from '@prisma/client';

export type TeamSchemaRecord = {
  readonly key: string;
  readonly document: unknown;
  readonly updatedAt: string;
};

export type TeamSchemaRepository = {
  readonly list: () => Promise<readonly TeamSchemaRecord[]>;
  readonly findByKey: (key: string) => Promise<TeamSchemaRecord | undefined>;
  readonly upsert: (input: { readonly key: string; readonly document: Prisma.InputJsonValue }) => Promise<TeamSchemaRecord>;
  readonly deleteByKey: (key: string) => Promise<void>;
};

const toTeamSchemaRecord = (record: TeamSchema): TeamSchemaRecord => ({
  key: record.key,
  document: record.document,
  updatedAt: record.updatedAt.toISOString(),
});

export const createPrismaTeamSchemaRepository = (prisma: PrismaClient): TeamSchemaRepository => ({
  list: async () => {
    const records = await prisma.teamSchema.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return records.map(toTeamSchemaRecord);
  },
  findByKey: async (key) => {
    const record = await prisma.teamSchema.findUnique({ where: { key } });

    if (record === null) {
      return undefined;
    }

    return toTeamSchemaRecord(record);
  },
  upsert: async (input) => {
    const record = await prisma.teamSchema.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        document: input.document,
      },
      update: {
        document: input.document,
      },
    });

    return toTeamSchemaRecord(record);
  },
  deleteByKey: async (key) => {
    await prisma.teamSchema.deleteMany({ where: { key } });
  },
});