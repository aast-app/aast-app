import fs from 'node:fs/promises';
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '../server/src/generated/postgresql/index.js';
Object.assign(process.env, dotenv.parse(await fs.readFile('.env.postgres.local')));
if (!process.env.DATABASE_URL?.startsWith('postgres') || !process.env.DATABASE_URL_UNPOOLED?.startsWith('postgres')) throw new Error('Neon connections are missing.');
execFileSync(process.execPath, ['server/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'server/prisma/postgresql.prisma'], { env: process.env, stdio: 'pipe' });
const db = new PrismaClient();
try {
  const users = JSON.parse(await fs.readFile('.deployment/accounts.json', 'utf8')).map(row => ({ ...row, isDeleted: Boolean(row.isDeleted), createdAt: new Date(row.createdAt) }));
  if (!users.some(row => row.role === 'admin' && !row.isDeleted)) throw new Error('An active administrator is required.');
  for (const model of ['student', 'registrationBatch', 'log', 'dailyOperation', 'dailyMetaData', 'uploadHistory']) if (await db[model].count()) throw new Error('Destination contains application data; refusing to overwrite.');
  const existing = await db.user.count();
  if (existing) throw new Error('Destination already has accounts; refusing to overwrite.');
  await db.$transaction(async tx => {
    for (const user of users) await tx.user.create({ data: user });
    await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"))`);
  });
  console.log(`Migrated ${await db.user.count()} user accounts. Student, batch, result and activity collections remain empty.`);
} finally { await db.$disconnect(); }
