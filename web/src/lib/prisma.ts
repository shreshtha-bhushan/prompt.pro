import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, PoolConfig } from 'pg';

const prismaClientSingleton = () => {
  // Prefer direct connection URLs over pgbouncer URLs for driver adapters
  const url = process.env.DATABASE_URL
    || process.env.POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_URL
    || 'postgresql://dummy:dummy@localhost:5432/dummy';

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  const config: PoolConfig = { connectionString: url };

  // Cloud databases (Supabase, Vercel Postgres) require SSL
  if (!isLocal) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
