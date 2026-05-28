import 'dotenv/config';

import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;
const datasource = databaseUrl === undefined || databaseUrl.trim().length === 0
  ? {}
  : { datasource: { url: databaseUrl } };

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...datasource,
});