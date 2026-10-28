import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// A fresh database and backup directory: never import or modify real student data.
test('browser API: accounts, calendar, logs, imports, exports and downloads', async () => {
  const directory = await mkdtemp(fileURLToPath(new URL('./.cept-browser-', import.meta.url)));
  process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
  process.env.BACKUP_DIR = path.join(directory, 'backups');
  const serverRoot = fileURLToPath(new URL('../', import.meta.url));
  await writeFile(path.join(directory, 'test.db'), '');
  let server;
  let prisma;
  try {
    execFileSync(process.execPath, [path.join(serverRoot, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', path.join(serverRoot, 'prisma/schema.prisma')], { env: process.env, stdio: 'pipe' });
    ({ prisma } = await import('../src/db/connect.js'));
    const { default: app } = await import('../src/app.js');
    const { default: bcrypt } = await import('bcryptjs');
    await prisma.user.create({ data: { username: 'migration-admin', password: await bcrypt.hash('fixture-password', 4), role: 'admin' } });
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie = '';
    const post = async (endpoint, body = {}) => {
      const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CEPT-Request': '1', Cookie: cookie }, body: JSON.stringify(body) });
      if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
      const data = await response.json();
      assert.equal(response.status, 200, `${endpoint}: ${JSON.stringify(data)}`);
      assert.equal(data.success, true, `${endpoint}: ${JSON.stringify(data)}`);
      return data;
    };
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/does-not-exist`)).status, 401);
    const login = await post('auth-login', { username: 'migration-admin', password: 'fixture-password' });
    assert.equal(login.user.role, 'admin');
    const admin = { adminUsername: 'migration-admin' };
    await post('admin-create-user', { ...admin, newUsername: 'temporary-user', newPassword: 'fixture-password', newRole: 'user' });
    await post('admin-edit-user', { ...admin, targetUsername: 'temporary-user', newUsername: 'renamed-user' });
    assert.ok((await post('admin-get-users', admin)).users.some(user => user.username === 'renamed-user'));
    await post('admin-delete-user', { ...admin, targetUsername: 'renamed-user' });
    assert.ok(!(await post('admin-get-users', admin)).users.some(user => user.username === 'renamed-user'));
    const date = '2026-10-23'; // Friday: changing one flag preserves the other weekend default.
    await post('toggle-not-needed', { targetDate: date, type: 'ids', value: false, username: admin.adminUsername });
    const operation = (await post('get-week-operations', { dates: [date] })).data[date];
    assert.equal(operation.idsNotNeeded, false);
    assert.equal(operation.scoresNotNeeded, true);
    await post('log-frontend-action', { username: admin.adminUsername, action: 'Edit Day', metadata: { targetDate: date } });
    assert.ok((await post('admin-get-logs', admin)).logs.some(log => log.action === 'Edit Day' && log.metadata.targetDate === date));
    const masterDraft = await post('upload-master-data-chunk', { totalRows: 1, chunkIndex: 0, username: admin.adminUsername, dataRows: [['00123', 'Last', 'First', '', '']], fileName: 'fixture.xlsx', isLastChunk: true });
    await post('commit-import', { draftId: masterDraft.draftId });
    assert.equal((await post('check-ids', { regNums: ['00123'] })).data['00123'].hasGrade, false);
    const idDraft = await post('preview-ids', {  username: admin.adminUsername, targetDate: date, files: [{ fileName: 'fixture.xlsx', sheets: [{ name: 'Students', rows: [['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'], ['00456', 'Fixture Student', '', '', '', '']] }] }] });
    await post('commit-import', { draftId: idDraft.draftId });
    const scoreDraft = await post('preview-scores', { username: admin.adminUsername, targetDate: date, scores: [{ rawRegNum: '00123', score: 75, value: 'B2' }] });
    await post('commit-import', { draftId: scoreDraft.draftId });
    assert.equal((await post('admin-get-students', { ...admin, searchQuery: '00123' })).students[0].score, 75);
    assert.deepEqual((await post('admin-next-registration-numbers', { ...admin, baseNumbers: ['00123'] })).numbers, ['00123-R1']);
    await post('log-cept-table', { username: admin.adminUsername, locationsCount: 1, totalProcessed: 1, unmatchedCount: 0, unmatchedRegNums: [] });
    await post('log-login-pdfs', { username: admin.adminUsername, successCount: 1, totalStudents: 1 });
    assert.ok((await post('get-dashboard-stats')).monthlyTablesGenerated >= 1);
    await post('get-dashboard-details');
    await post('get-dashboard-filters');
    const backup = await post('admin-export-db', { ...admin, mode: 'manual', passphrase: 'fixture-backup-passphrase' });
    assert.ok(backup.fileName.endsWith('.json'));
    assert.equal(backup.backup.format, 'cept-encrypted-backup');
    assert.ok(!JSON.stringify(backup.backup).includes('migration-admin'));
    await post('admin-export-db', { ...admin, mode: 'silent' });
    assert.ok((await readdir(process.env.BACKUP_DIR)).some(name => name.startsWith('backup_')));
    if (process.env.CEPT_BROWSER_TEST === '1') await checkBrowser(base, directory);
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /<div id="root"><\/div>/);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});

async function checkBrowser(base, directory) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || 'msedge' });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Keep this test entirely local, including when a page contains external links.
    await page.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('data:') || route.request().url().startsWith('blob:') ? route.continue() : route.abort());
    await page.addInitScript(() => { globalThis.showSaveFilePicker = undefined; });
    await page.goto(base);
    await page.getByLabel('Username', { exact: true }).fill('migration-admin');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('navigation', { name: 'Main navigation' }).waitFor();
    for (const name of ['Admin control', 'Activity log', 'CEPT data', 'CEPT Create']) {
      await page.getByRole('link', { name }).click();
      await page.locator('#main-content:not([inert])').waitFor();
    }
    await page.getByRole('heading', { name: 'CEPT Create', exact: true }).waitFor();
    await page.getByRole('button', { name: 'PREVIEW LAYOUT' }).click();
    await page.getByTitle('PDF Preview').waitFor();
    const { default: XLSX } = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['Reg num', 'Name', 'Time', 'Location', 'Username', 'Password'],
      ['00123', 'Fixture & Student', '10:00 AM', 'Fixture Lab', '00123', 'fixture-only'],
    ]), 'Fixture');
    await page.locator('input[type=file]').nth(2).setInputFiles({ name: 'fixture.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) });
    const downloaded = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'GENERATE LOGIN PDF', exact: true }).click();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(), 'Login_PDFs.zip');
    await download.saveAs(path.join(directory, 'Login_PDFs.zip'));
    await page.getByRole('heading', { name: 'PDF Generated', exact: true }).waitFor();
    const registrations = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(registrations, XLSX.utils.aoa_to_sheet([
      ['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'],
      ['00123', 'Fixture & Student', 'fixture@example.invalid', '01000', '2026-10-27', '10:00 AM'],
    ]), 'Registrations');
    await page.locator('input[type=file]').nth(0).setInputFiles({ name: 'registration.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(registrations, { type: 'buffer', bookType: 'xlsx' }) });
    await page.getByText('Select location...', { exact: true }).click();
    await page.locator('.cept-dropdown-item').getByText('CS_lab 404', { exact: true }).click();
    await page.locator('input[type=file]').nth(1).setInputFiles({ name: 'tokens.csv', mimeType: 'text/csv', buffer: Buffer.from('Tokens\nLogin,Portal Password\n00123,fixture-only\n') });
    const rosterDownloaded = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'EXPORT EXCEL & PDF', exact: true }).click();
    const rosterDownload = await rosterDownloaded;
    assert.equal(rosterDownload.suggestedFilename(), 'CEPT_Tables.zip');
    const rosterPath = path.join(directory, 'CEPT_Tables.zip');
    await rosterDownload.saveAs(rosterPath);
    await page.getByRole('heading', { name: 'Table Generated', exact: true }).waitFor();
    assert.deepEqual(errors, [], errors.join('\n'));
  } finally { await browser.close(); }
}
