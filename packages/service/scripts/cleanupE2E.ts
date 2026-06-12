import 'dotenv/config';
import { getPrismaClient } from '../src/adapter/prismaClient';

const main = async (): Promise<void> => {
  const prisma = getPrismaClient();
  const deleted = await prisma.teamSchema.deleteMany({
    where: {
      key: {
        startsWith: 'e2e-',
      },
    },
  });

  console.log(`[cleanup] Deleted ${deleted.count} temporary E2E schemas`);
  await prisma.$disconnect();
};

void main().catch(async (error: unknown) => {
  console.error('[cleanup] failed:', error);
});
