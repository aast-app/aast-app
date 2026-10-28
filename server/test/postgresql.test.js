import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

test('Neon state persists across two independent backend processes', { skip: process.env.CEPT_POSTGRES_TEST !== '1' }, async () => {
  const { PrismaClient } = await import('../src/generated/postgresql/index.js');
  const env = { ...process.env, ...dotenv.parse(await fs.readFile('.env.postgres.local')), BACKUP_ENCRYPTION_KEY: randomBytes(32).toString('hex') };
  const schema = `cept_test_${randomBytes(8).toString('hex')}`;
  const root = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL_UNPOOLED } } });
  const scoped = value => { const url = new URL(value); url.searchParams.set('schema', schema); return url.toString(); };
  env.DATABASE_URL = scoped(env.DATABASE_URL); env.DATABASE_URL_UNPOOLED = scoped(env.DATABASE_URL_UNPOOLED);
  const children = []; let db;
  async function server() {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `import app from './server/src/app.js'; const server=app.listen(0,'127.0.0.1',()=>console.log('PORT='+server.address().port));`], { env, stdio: ['ignore', 'pipe', 'pipe'] }); children.push(child);
    return new Promise((resolve, reject) => { child.once('error', reject); child.stdout.on('data', data => { const match = String(data).match(/PORT=(\d+)/); if (match) resolve(`http://127.0.0.1:${match[1]}`); }); child.once('exit', code => reject(new Error(`Server stopped: ${code}`))); });
  }
  try {
    assert.match(schema, /^cept_test_[a-f0-9]+$/);
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, ['server/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'server/prisma/postgresql.prisma'], { env, stdio: 'pipe' });
    db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    await db.user.create({ data: { username: 'fixture', role: 'admin', password: await bcrypt.hash('fixture-only-password', 4) } });
    const first = await server(), second = await server(); let cookie = '';
    async function post(base, action, body = {}) {
      const response = await fetch(`${base}/api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CEPT-Request': '1', Cookie: cookie }, body: JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const result = await response.json(); assert.equal(response.status, 200); assert.equal(result.success, true, result.message); return result;
    }
    await post(first, 'auth-login', { username: 'fixture', password: 'fixture-only-password' });
    await post(second, 'auth-session');
    const staged = await post(first, 'upload-master-data-chunk', { fileName: 'Fixture.csv', totalRows: 2, chunkIndex: 0, dataRows: [['001', 'Student', 'One', 75, 'B2']], isLastChunk: false });
    const preview = await post(second, 'upload-master-data-chunk', { fileName: 'Fixture.csv', totalRows: 2, chunkIndex: 1, uploadId: staged.uploadId, dataRows: [['002', 'Student', 'Two', 65, 'B1']], isLastChunk: true });
    const receipt = await post(first, 'commit-import', { draftId: preview.draftId });
    assert.deepEqual(await post(second, 'commit-import', { draftId: preview.draftId }), receipt);
    assert.equal(await db.student.count(), 2); assert.equal(await db.uploadHistory.count(), 1);
    assert.equal(await db.serverBackup.count(), 1);
    const ids = await post(first, 'preview-ids', { targetDate: '2026-10-28', files: [{ fileName: 'IDs.xlsx', sheets: [{ name: 'Students', rows: [['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'], ['001', 'Official One', '', '', '28-10-2026', '10:00']] }] }] });
    await post(second, 'commit-import', { draftId: ids.draftId }); assert.equal(await db.registrationBatch.count(), 1);
    await post(second, 'auth-logout');
    const response = await fetch(`${first}/api/auth-session`, { method: 'POST', headers: { Cookie: cookie, 'X-CEPT-Request': '1', 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(response.status, 401);
  } finally {
    for (const child of children) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    if (db) await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect();
  }
});
