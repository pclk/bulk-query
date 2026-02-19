import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
