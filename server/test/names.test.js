import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const files = (number, name) => [{ fileName: 'Official IDs.xlsx', sheets: [{ name: 'Students', rows: [['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'], [number, name, '', '', '28-10-2026', '10:00 AM']] }] }];
test('official names belong to the whole registration family and score names cannot replace them', async t => {
  const folder = await mkdtemp(fileURLToPath(new URL('./.cept-browser-names-', import.meta.url)));
  const root = fileURLToPath(new URL('../', import.meta.url));
  process.env.DATABASE_URL = `file:${path.join(folder, 'test.db').replaceAll('\\', '/')}`;
  process.env.BACKUP_DIR = path.join(folder, 'backups');
  await writeFile(path.join(folder, 'test.db'), '');
  let server, prisma;
  try {
    execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', path.join(root, 'prisma/schema.prisma')], { env: process.env, stdio: 'pipe' });
    ({ prisma } = await import('../src/db/connect.js'));
    const { default: app } = await import('../src/app.js');
    const { default: bcrypt } = await import('bcryptjs');
    const { ensureBatchSchema } = await import('../src/db/upgrade.js');
    const { buildBackup, encryptBackup } = await import('../src/services/backup.js');
    await prisma.user.create({ data: { username: 'name-admin', role: 'admin', password: await bcrypt.hash('fixture-password', 4) } });
    for (const [registrationNumber, firstName, lastName, score] of [['123', 'joe', 'wael', 40], ['123-R1', 'Student', 'Alias', 43], ['123-R2', 'Wrong', 'Name', null], ['1234', 'Other', 'Student', 72]]) await prisma.student.create({ data: { registrationNumber, firstName, lastName, score } });
    server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie = '';
    async function post(endpoint, body = {}, status = 200) {
      const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CEPT-Request': '1', Cookie: cookie }, body: JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = await response.json(); assert.equal(response.status, status, `${endpoint}: ${JSON.stringify(data)}`);
      if (status === 200) assert.equal(data.success, true, JSON.stringify(data));
      return data;
    }
    async function master(rows) {
      const draft = await post('upload-master-data-chunk', { fileName: 'Scores.xlsx', totalRows: rows.length, chunkIndex: 0, isLastChunk: true, dataRows: rows });
      return post('commit-import', { draftId: draft.draftId });
    }
    const family = () => prisma.student.findMany({ where: { OR: [{ registrationNumber: '123' }, { registrationNumber: { startsWith: '123-R' } }] }, orderBy: { id: 'asc' } });
    await post('auth-login', { username: 'name-admin', password: 'fixture-password' });
    await t.test('existing retakes inherit the original registration name and keep their scores', async () => {
      const { nameFields } = await import('../src/services/studentNames.js');
      assert.deepEqual(nameFields(' Joe   Wael ', { firstName: 'joe', lastName: 'wael' }, true), { name: 'Joe Wael', firstName: 'Joe', lastName: 'Wael', nameVerified: true });
      await ensureBatchSchema(prisma);
      const rows = await family();
      assert.deepEqual(rows.map(row => row.name), ['joe wael', 'joe wael', 'joe wael']);
      assert.deepEqual(rows.map(row => [row.firstName, row.lastName]), [['joe', 'wael'], ['joe', 'wael'], ['joe', 'wael']]);
      assert.deepEqual(rows.map(row => row.score), [40, 43, null]); assert.ok(rows.every(row => !row.nameVerified));
      await master([['123', 'Student Last', 'Wrong First', 55, 'B1'], ['777-R1', 'Fake', 'Alias', 60, 'B2'], ['777', 'Person', 'New', 61, 'B2']]);
      assert.ok((await family()).every(row => row.name === 'joe wael'));
      const newlyImported = await prisma.student.findMany({ where: { registrationNumber: { startsWith: '777' } } });
      assert.ok(newlyImported.every(row => row.name === 'New Person' && !row.nameVerified));
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '1234' } })).name, 'Other Student');
    });
    await t.test('official ID corrections confirm the base and every attempt; score imports cannot override them', async () => {
      const preview = await post('preview-ids', { targetDate: '2026-10-28', files: files('123', '  Youssef   Wael  ') });
      assert.equal((await family())[0].name, 'joe wael'); // Preview alone does not rename anything.
      assert.equal(preview.files[0].students[0].name, 'Youssef Wael');
      await post('commit-import', { draftId: preview.draftId });
      assert.ok((await family()).every(row => row.name === 'Youssef Wael' && row.nameVerified));
      assert.ok((await family()).every(row => row.firstName === '' && row.lastName === 'Youssef Wael'));
      assert.deepEqual((await family()).map(row => row.score), [55, 43, null]);
      await master([['123', 'Invented', 'Name', 70, 'B2'], ['123-R1', 'Random', 'Alias', 71, 'B2'], ['123-R3', 'Whatever', 'Student', 72, 'B2'], ['999', 'Unknown', 'Student', 65, 'B1']]);
      assert.ok((await family()).every(row => row.name === 'Youssef Wael' && row.nameVerified));
      const provisional = await prisma.student.findUnique({ where: { registrationNumber: '999' } });
      assert.equal(provisional.name, 'Student Unknown'); assert.equal(provisional.nameVerified, false);
      const score = await post('preview-scores', { targetDate: '2026-10-28', scores: [{ rawRegNum: '123-R2', firstName: 'Student Supplied', lastName: 'Wrong', name: 'Ignore me', score: 90, value: 'C1' }] });
      await post('commit-import', { draftId: score.draftId });
      assert.ok((await family()).every(row => row.name === 'Youssef Wael' && row.nameVerified));
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '123-R2' } })).score, 90);
      const correction = await post('preview-ids', { targetDate: '2026-10-28', files: files('123', 'Joe Wael') });
      const scoresBefore = (await family()).map(row => row.score);
      await post('commit-import', { draftId: correction.draftId });
      const oldRows = (await family()).filter(row => row.registrationNumber !== '123-R4');
      assert.deepEqual(oldRows.map(row => row.score), scoresBefore);
      assert.ok((await family()).every(row => row.name === 'Joe Wael' && row.nameVerified));
      const search = await post('admin-get-students', { searchQuery: 'Joe Wael' });
      assert.ok(search.students.length >= 5); assert.ok(search.students.every(row => row.name === 'Joe Wael'));
      const conflicting = files('123', 'Joe Wael'); conflicting[0].sheets[0].rows.push(['123-R1', 'Different Person', '', '', '', '']);
      await post('preview-ids', { targetDate: '2026-10-28', files: conflicting }, 400);
      assert.ok((await family()).every(row => row.name === 'Joe Wael'));
      const backup = await buildBackup('fixture'); assert.equal(backup.version, 3);
      const review = await post('admin-preview-backup', { backup: await encryptBackup(backup, 'fixture-backup-passphrase'), passphrase: 'fixture-backup-passphrase' });
      assert.equal(review.counts.student, await prisma.student.count());
      // Prior complete backups recover the verified name from their official batch history.
      backup.version = 2; for (const row of backup.collections.student) { delete row.nameVerified; row.name = 'Old alias'; }
      const older = await post('admin-preview-backup', { backup: await encryptBackup(backup, 'fixture-backup-passphrase'), passphrase: 'fixture-backup-passphrase' });
      await post('admin-restore-backup', { restoreToken: older.restoreToken, confirmation: 'RESTORE' });
      assert.ok((await family()).every(row => row.name === 'Joe Wael' && row.nameVerified));
    });
    await t.test('startup recovers official provenance from historical ID batches', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const legacy = new PrismaClient({ datasources: { db: { url: `file:${path.join(folder, 'legacy.db').replaceAll('\\', '/')}` } } });
      try {
        await legacy.$executeRawUnsafe(`CREATE TABLE "Student" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "registrationNumber" TEXT NOT NULL UNIQUE, "lastName" TEXT NOT NULL, "firstName" TEXT NOT NULL, "score" REAL, "value" TEXT, "idsNotNeeded" BOOLEAN NOT NULL DEFAULT false, "scoresNotNeeded" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await legacy.$executeRawUnsafe(`INSERT INTO "Student" ("registrationNumber", "lastName", "firstName", "score") VALUES ('123', 'wael', 'joe', 40), ('123-R1', 'Wrong', 'Student', 43)`);
        await legacy.$executeRawUnsafe(`CREATE TABLE "RegistrationBatch" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "date" TEXT NOT NULL, "sequence" INTEGER NOT NULL, "testDate" TEXT NOT NULL, "createdBy" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "studentCount" INTEGER NOT NULL, "fileCount" INTEGER NOT NULL, "files" TEXT NOT NULL)`);
        const historical = files('123', 'Youssef Wael'); historical[0].students = [{ rowIndex: 1, registrationNumber: '123-R1', originalRegistrationNumber: '123', name: 'Youssef Wael' }]; historical[0].sheets[0].rows[1][0] = '123-R1';
        await legacy.registrationBatch.create({ data: { name: '27-10-2026', date: '2026-10-27', sequence: 1, testDate: '2026-10-27', createdBy: 'fixture', studentCount: 1, fileCount: 1, files: JSON.stringify(historical) } });
        await ensureBatchSchema(legacy); await ensureBatchSchema(legacy);
        const rows = await legacy.student.findMany({ orderBy: { id: 'asc' } });
        assert.ok(rows.every(row => row.name === 'Youssef Wael' && row.nameVerified));
        assert.deepEqual(rows.map(row => row.score), [40, 43]);
      } finally { await legacy.$disconnect(); }
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    await rm(folder, { recursive: true, force: true });
  }
});
