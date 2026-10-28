import { prisma } from '../db/connect.js';
export const cloudDatabase = () => /^postgres(?:ql)?:/.test(process.env.DATABASE_URL || '');
// SQLite remains available for isolated local fixtures; deployed state is shared in Neon.
export function runtimeStore(namespace) {
  const memory = new Map();
  const row = (key, value) => ({ key: `${namespace}:${key}`, namespace, payload: JSON.stringify(value), expiresAt: new Date(value.expires ?? value.expiresAt ?? Date.now() + 8 * 60 * 60 * 1000) });
  return {
    async get(key) { if (!cloudDatabase()) return memory.get(key); const item = await prisma.runtimeState.findUnique({ where: { key: `${namespace}:${key}` } }); return item && item.expiresAt > new Date() ? JSON.parse(item.payload) : undefined; },
    async set(key, value, db = prisma) { if (!cloudDatabase()) { memory.set(key, value); return; } const data = row(key, value); await db.runtimeState.upsert({ where: { key: data.key }, create: data, update: data }); },
    async delete(key) { if (!cloudDatabase()) return memory.delete(key); await prisma.runtimeState.deleteMany({ where: { key: `${namespace}:${key}` } }); },
    async clear(db = prisma) { if (!cloudDatabase()) return memory.clear(); await db.runtimeState.deleteMany({ where: { namespace } }); },
    async entries() { if (!cloudDatabase()) return [...memory]; return (await prisma.runtimeState.findMany({ where: { namespace, expiresAt: { gt: new Date() } } })).map(item => [item.key.slice(namespace.length + 1), JSON.parse(item.payload)]); },
    async cleanup() { if (!cloudDatabase()) { for (const [key, value] of memory) if ((value.expires ?? value.expiresAt) < Date.now()) memory.delete(key); } else await prisma.runtimeState.deleteMany({ where: { namespace, expiresAt: { lte: new Date() } } }); }
  };
}
