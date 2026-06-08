import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let sharedPrismaClient: PrismaClient | undefined;

const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL is required for agent markdown metadata persistence.');
  }

  return new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
};

export const getPrismaClient = (): PrismaClient => {
  if (sharedPrismaClient !== undefined) {
    return sharedPrismaClient;
  }

  sharedPrismaClient = createPrismaClient();

  return sharedPrismaClient;
};