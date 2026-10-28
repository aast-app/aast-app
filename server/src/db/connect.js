import { ensureBatchSchema } from './upgrade.js';
import '../config.js';
const { PrismaClient } = /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '')
  ? await import('../generated/postgresql/index.js')
  : await import('@prisma/client');
export const prisma = new PrismaClient();

export async function connectDB() {
  try {
    await prisma.$connect();
    if (!/^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '')) await ensureBatchSchema(prisma);
    console.log('SQL Database (Prisma) connected perfectly!');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}
