import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const headers = ['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time', 'Notes'];
function filesFor(numbers, filename = 'Students.xlsx') {
  return [{ fileName: filename, sheets: [{ name: 'Registrations', rows: [headers, ...numbers.map(number => [number, `Student ${number}`, `${number}@example.invalid`, '01001230000', '27-10-2026', '10:00 AM', `Note ${number}`])] }] }];
}
test('registration batches, exact result matching, downloads and upgrade', async t => {
  const folder = await mkdtemp(fileURLToPath(new URL('./.cept-browser-batches-', import.meta.url)));
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
    const { default: XLSX } = await import('xlsx');
    const { cairoDate } = await import('../src/services/registrationBatches.js');
    const { snapshot, buildBackup, encryptBackup } = await import('../src/services/backup.js');
    await prisma.user.create({ data: { username: 'batch-admin', password: await bcrypt.hash('fixture-password', 4), role: 'admin' } });
    await prisma.user.create({ data: { username: 'batch-staff', password: await bcrypt.hash('fixture-password', 4), role: 'user' } });
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    function client() {
      let cookie = '';
      const request = async (endpoint, body, status = 200, binary = false) => {
        const response = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CEPT-Request': '1', Cookie: cookie }, body: JSON.stringify(body || {}) });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        if (binary) { assert.equal(response.status, status); assert.match(response.headers.get('content-disposition'), /upload\.xlsx/); return Buffer.from(await response.arrayBuffer()); }
        const data = await response.json();
        assert.equal(response.status, status, `${endpoint}: ${JSON.stringify(data)}`);
        if (status === 200) assert.equal(data.success, true, JSON.stringify(data));
        return data;
      };
      return request;
    }
    const admin = client(), staff = client(), anonymous = client();
    await admin('auth-login', { username: 'batch-admin', password: 'fixture-password' });
    await staff('auth-login', { username: 'batch-staff', password: 'fixture-password' });
    await anonymous('list-batches', {}, 401);
    let savedId;
    await t.test('ten students retain file groups, extra sheets and sequential attempts', async () => {
      for (const [registrationNumber, score] of [['001', 80], ['001-R1', 81], ['001-R2', 82], ['002', 70], ['003-R9', 60], ['003-R10', 61], ['004', 50], ['004-R2', 51], ['005', 0]]) {
        await prisma.student.create({ data: { registrationNumber, score, lastName: 'Original Last', firstName: 'Original First', email: 'old@example.invalid', mobile: 'old', value: 'OLD', registrationData: JSON.stringify({ fields: { 'Original Extra': 'preserved' } }) } });
      }
      const originalCount = await prisma.student.count();
      const inputs = [...filesFor(['001', '002', '003', '004', '005'], 'Lab A.xlsx'), ...filesFor(['006', '007', '008', '009', '010'], 'Lab B.xlsx')];
      inputs[0].sheets.push({ name: 'Other Data', rows: [['Extra column'], ['Preserve <this> & that']] });
      const preview = await staff('preview-ids', { targetDate: '2026-10-27', files: inputs });
      const expected = ['001-R3', '002-R1', '003-R11', '004-R3', '005-R1', '006', '007', '008', '009', '010'];
      assert.equal(preview.processedCount, 10);
      assert.equal(preview.modifiedCount, 5);
      assert.equal(await prisma.student.count(), originalCount);
      assert.equal(await prisma.registrationBatch.count(), 0);
      assert.deepEqual(preview.files.flatMap(file => file.students.map(student => student.registrationNumber)), expected);
      assert.deepEqual(preview.files[0].sheets[1], inputs[0].sheets[1]);
      const saved = await staff('commit-import', { draftId: preview.draftId });
      savedId = saved.batch.id;
      assert.equal(saved.batch.name, cairoDate().split('-').reverse().join('-'));
      const retry = await staff('commit-import', { draftId: preview.draftId });
      assert.equal(retry.batch.id, savedId);
      assert.equal(await prisma.registrationBatch.count(), 1);
      assert.equal(await prisma.student.count(), originalCount + 10);
      const old = await prisma.student.findUnique({ where: { registrationNumber: '001-R2' } });
      const next = await prisma.student.findUnique({ where: { registrationNumber: '001-R3' } });
      assert.equal(old.score, 82);
      assert.equal(next.score, null); assert.equal(next.value, null);
      assert.equal(next.lastName, 'Student 001'); assert.equal(next.firstName, '');
      assert.equal(next.nameVerified, true);
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '001' } })).name, 'Student 001');
      assert.equal(next.name, 'Student 001'); assert.equal(next.email, '001@example.invalid'); assert.equal(next.mobile, '01001230000');
      assert.equal(JSON.parse(next.registrationData).values[6], 'Note 001');
      assert.equal(JSON.parse(next.registrationData).fields['Original Extra'], 'preserved');
      const detail = (await staff('get-batch', { batchId: savedId })).batch;
      assert.equal(detail.files.length, 2); assert.equal(detail.files[0].fileName, 'Lab A.xlsx');
      assert.deepEqual(detail.files[0].sheets[1], inputs[0].sheets[1]);
      const downloaded = await staff('batch-upload', { batchId: savedId }, 200, true);
      const book = XLSX.read(downloaded, { type: 'buffer', cellNF: true });
      assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets.upload, { header: 1 }), expected.map(number => [number]));
      assert.equal(book.Sheets.upload.A1.t, 's'); assert.equal(book.Sheets.upload.A1.z, '@');
      const again = await staff('preview-ids', { targetDate: '2026-10-27', files: inputs });
      assert.deepEqual(again.files.flatMap(file => file.students.map(student => student.registrationNumber)), expected);
      const savedAgain = await staff('commit-import', { draftId: again.draftId });
      assert.notEqual(savedAgain.batch.name, saved.batch.name);
      assert.equal(await prisma.student.count(), originalCount + 10);
      const duplicates = await staff('preview-ids', { targetDate: '2026-10-27', files: filesFor(['011', '011']) });
      assert.equal(duplicates.draftId, null);
      assert.deepEqual(duplicates.duplicates, ['011']);
    });
    await t.test('scores match the exact R number; batch and student saves roll back together', async () => {
      const score = await staff('preview-scores', { targetDate: '2026-10-27', scores: [{ rawRegNum: '001-R3', score: 95, value: 'C1' }, { rawRegNum: '001-R30', score: 40, value: 'A1' }] });
      assert.equal(score.matchedCount, 1); assert.deepEqual(score.unmatchedNumbers, ['001-R30']);
      await staff('commit-import', { draftId: score.draftId });
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '001-R3' } })).score, 95);
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '001' } })).score, 80);
      assert.equal((await prisma.student.findUnique({ where: { registrationNumber: '001-R2' } })).score, 82);
      const next = await staff('preview-ids', { targetDate: '2026-10-27', files: filesFor(['001']) });
      assert.equal(next.files[0].students[0].registrationNumber, '001-R4');
      await staff('discard-import', { draftId: next.draftId });
      const date = new Date().toLocaleDateString('en-CA');
      const meta = await prisma.dailyMetaData.findUnique({ where: { activityDate: date } });
      const count = await prisma.registrationBatch.count();
      const broken = await staff('preview-ids', { targetDate: '2026-10-27', files: filesFor(['ROLLBACK']) });
      await prisma.dailyMetaData.update({ where: { activityDate: date }, data: { ceptData: 'broken' } });
      await staff('commit-import', { draftId: broken.draftId }, 500);
      assert.equal(await prisma.student.count({ where: { registrationNumber: 'ROLLBACK' } }), 0);
      assert.equal(await prisma.registrationBatch.count(), count);
      await prisma.dailyMetaData.update({ where: { activityDate: date }, data: { ceptData: meta.ceptData } });
      await staff('discard-import', { draftId: broken.draftId });
      const { default: ExcelJS } = await import('exceljs');
      const { cleanScoreWorkbook } = await import('../../src/features/scores/export.js');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Results');
      sheet.addRow(['Registration Number', 'Last Name', 'First Name', 'Score', 'Value', 'Extra']);
      sheet.addRow(['001-R3', 'Last', 'First', 95, 'C1', { formula: 'D2+1', result: 96 }]);
      sheet.getCell('B2').font = { bold: true }; sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
      workbook.addWorksheet('Untouched').getCell('A1').value = 'Keep all sheets';
      const buffer = await workbook.xlsx.writeBuffer();
      const cleaned = await cleanScoreWorkbook({ file: { name: 'scores.xlsx' }, originalBuffer: buffer, sheetName: 'Results', rows: [{ r: 1, regNumRaw: '001-R3', strippedRegNum: '001' }] });
      const result = new ExcelJS.Workbook(); await result.xlsx.load(cleaned);
      assert.equal(result.getWorksheet('Results').getCell('A2').value, '001');
      assert.equal(result.getWorksheet('Results').getCell('B2').font.bold, true);
      assert.equal(result.getWorksheet('Results').getCell('A2').fill.fgColor.argb, 'FFFF0000');
      assert.deepEqual(result.getWorksheet('Results').getCell('F2').value, { formula: 'D2+1', result: 96 });
      assert.equal(result.getWorksheet('Untouched').getCell('A1').value, 'Keep all sheets');
    });
    await t.test('backups include batches and accept older complete backups', async () => {
      const before = await snapshot(prisma);
      const backup = await admin('admin-export-db', { mode: 'manual', passphrase: 'batch-fixture-passphrase' });
      await prisma.registrationBatch.deleteMany();
      const preview = await admin('admin-preview-backup', { backup: backup.backup, passphrase: 'batch-fixture-passphrase' });
      assert.equal(preview.counts.registrationBatch, before.registrationBatch.length);
      await admin('admin-restore-backup', { restoreToken: preview.restoreToken, confirmation: 'RESTORE' });
      const after = await snapshot(prisma);
      assert.deepEqual(after.registrationBatch, before.registrationBatch); assert.deepEqual(after.student, before.student);
      await admin('auth-login', { username: 'batch-admin', password: 'fixture-password' });
      await staff('auth-login', { username: 'batch-staff', password: 'fixture-password' });
      const legacy = await buildBackup('fixture'); legacy.version = 1; delete legacy.collections.registrationBatch;
      for (const row of legacy.collections.student) for (const key of ['name', 'nameVerified', 'email', 'mobile', 'examDate', 'examTime', 'registrationData']) delete row[key];
      const old = await admin('admin-preview-backup', { backup: await encryptBackup(legacy, 'legacy-fixture-passphrase'), passphrase: 'legacy-fixture-passphrase' });
      assert.equal(old.counts.registrationBatch, 0); assert.equal(old.currentCounts.registrationBatch, before.registrationBatch.length);
    });
    await t.test('existing SQLite students survive the additive schema upgrade', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const { ensureBatchSchema } = await import('../src/db/upgrade.js');
      const legacy = new PrismaClient({ datasources: { db: { url: `file:${path.join(folder, 'legacy.db').replaceAll('\\', '/')}` } } });
      try {
        await legacy.$executeRawUnsafe(`CREATE TABLE "Student" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "registrationNumber" TEXT NOT NULL UNIQUE, "lastName" TEXT NOT NULL, "firstName" TEXT NOT NULL, "score" REAL, "value" TEXT, "idsNotNeeded" BOOLEAN NOT NULL DEFAULT false, "scoresNotNeeded" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
        await legacy.$executeRawUnsafe(`INSERT INTO "Student" ("registrationNumber", "lastName", "firstName", "score") VALUES ('LEGACY', 'Original', 'Student', 88)`);
        await ensureBatchSchema(legacy); await ensureBatchSchema(legacy);
        const row = await legacy.student.findUnique({ where: { registrationNumber: 'LEGACY' } });
        assert.equal(row.score, 88); assert.equal(row.lastName, 'Original'); assert.equal(row.registrationData, '{}');
        assert.equal(await legacy.registrationBatch.count(), 0);
      } finally { await legacy.$disconnect(); }
    });
    await t.test('quick login names prefer original then R1 through R10 without changing token IDs', async () => {
      await prisma.student.createMany({ data: [
        { registrationNumber: 'LOOKUP', name: 'Original Name' },
        { registrationNumber: 'LOOKUP-R1', name: 'Retake Name' },
        { registrationNumber: 'FALLBACK-R2', name: 'First Available' },
        { registrationNumber: 'FALLBACK-R10', name: 'Later Retake' },
        { registrationNumber: 'BOUNDARY-R10', name: 'Last Allowed' },
        { registrationNumber: 'OUTSIDE-R11', name: 'Not Allowed' }
      ].map(row => ({ ...row, firstName: '', lastName: row.name })) });
      const result = await staff('login-student-details', { registrationNumbers: ['LOOKUP-R8', 'FALLBACK-R9', 'BOUNDARY-R20', 'OUTSIDE-R11', 'MISSING'] });
      assert.deepEqual(result.students.map(row => [row.registrationNumber, row.matchedRegistrationNumber, row.name]), [['LOOKUP-R8', 'LOOKUP', 'Original Name'], ['FALLBACK-R9', 'FALLBACK-R2', 'First Available'], ['BOUNDARY-R20', 'BOUNDARY-R10', 'Last Allowed']]);
      await anonymous('login-student-details', { registrationNumbers: ['LOOKUP'] }, 401);
    });
    if (process.env.CEPT_BATCH_BROWSER === '1') await browserCheck(base, folder, prisma, XLSX);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    await rm(folder, { recursive: true, force: true });
  }
});

async function browserCheck(base, folder, prisma, XLSX) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [], downloads = [];
    page.on('pageerror', error => errors.push(error.message)); page.on('download', download => downloads.push(download));
    await page.route('**/*', route => route.request().url().startsWith(base) || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
    await page.addInitScript(() => { globalThis.showSaveFilePicker = undefined; });
    await page.goto(base);
    await page.getByLabel('Username', { exact: true }).fill('batch-staff');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('link', { name: 'CEPT data' }).click();
    await page.getByRole('button', { name: 'Upload IDs', exact: true }).first().click();
    const uploads = ['UI-A', 'UI-B'].map((number, index) => {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(filesFor([number])[0].sheets[0].rows), 'Students');
      return { name: `UI Lab ${index + 1}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) };
    });
    await page.getByRole('dialog').locator('input[type=file]').setInputFiles(uploads);
    await page.getByRole('button', { name: 'Save batch', exact: true }).waitFor();
    assert.equal(await prisma.student.count({ where: { registrationNumber: 'UI-A' } }), 0);
    await page.getByRole('button', { name: 'Save batch', exact: true }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).waitFor();
    assert.equal(downloads.length, 0);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('link', { name: 'CEPT Create' }).click();
    await page.getByRole('button', { name: 'Batches', exact: true }).click();
    if (process.env.CEPT_BATCH_ARTIFACT_DIR) await page.screenshot({ path: path.join(process.env.CEPT_BATCH_ARTIFACT_DIR, 'batches-list.png') });
    await page.locator('.batch-list-item').first().click();
    await page.getByRole('heading', { name: 'UI Lab 1.xlsx', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'UI Lab 2.xlsx', exact: true }).waitFor();
    if (process.env.CEPT_BATCH_ARTIFACT_DIR) await page.screenshot({ path: path.join(process.env.CEPT_BATCH_ARTIFACT_DIR, 'batches-detail.png') });
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download upload.xlsx', exact: true }).click();
    const download = await pending; assert.equal(download.suggestedFilename(), 'upload.xlsx');
    const target = path.join(folder, 'upload.xlsx'); await download.saveAs(target);
    const book = XLSX.read(await readFile(target), { type: 'buffer' });
    assert.deepEqual(XLSX.utils.sheet_to_json(book.Sheets.upload, { header: 1 }), [['UI-A'], ['UI-B']]);
    await page.setViewportSize({ width: 390, height: 844 });
    const rect = await page.getByRole('dialog').boundingBox(); assert.ok(rect.width <= 390);
    if (process.env.CEPT_BATCH_ARTIFACT_DIR) await page.screenshot({ path: path.join(process.env.CEPT_BATCH_ARTIFACT_DIR, 'batches-mobile.png') });
    await page.keyboard.press('Escape'); await page.locator('dialog[open]').waitFor({ state: 'hidden' }); assert.equal(await page.locator('dialog[open]').count(), 0);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'Build master data table', exact: true }).click();
    await page.getByRole('heading', { name: 'Select a batch', exact: true }).waitFor();
    await page.locator('.batch-list-item').first().click();
    await page.getByRole('button', { name: 'Use this batch', exact: true }).click();
    await page.getByRole('button', { name: 'Location for UI Lab 1.xlsx', exact: true }).waitFor();
    assert.equal(await page.locator('.cept-mapping-row').count(), 2);
    assert.equal(await page.getByRole('button', { name: 'Upload tokens file (.csv)', exact: true }).count(), 0);
    for (const file of ['UI Lab 1.xlsx', 'UI Lab 2.xlsx']) {
      await page.getByRole('button', { name: `Location for ${file}`, exact: true }).click();
      await page.getByText('CS_lab 404', { exact: true }).last().click();
    }
    await page.getByRole('button', { name: 'Upload tokens file (.csv)', exact: true }).waitFor();
    await page.getByLabel('Upload login tokens', { exact: true }).setInputFiles({ name: 'Tokens.csv', mimeType: 'text/csv', buffer: Buffer.from('Tokens\nLogin,Portal Password\nUI-A,pw-a\nUI-B,pw-b\n') });
    await page.getByRole('button', { name: 'EXPORT EXCEL & PDF', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Change batch', exact: true }).click();
    await page.locator('.batch-list-item').first().click();
    await page.getByRole('button', { name: 'Use this batch', exact: true }).click();
    await page.getByRole('button', { name: 'Location for UI Lab 1.xlsx', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'EXPORT EXCEL & PDF', exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Location for UI Lab 1.xlsx', exact: true }).textContent(), 'Select location...▾');
    // A tall, wide preview must have one vertical scroll owner.
    await page.route('**/get-batch', async route => {
      const response = await route.fetch(); const payload = await response.json();
      for (const file of payload.batch.files) {
        const rows = file.sheets[0].rows;
        for (let index = 0; index < 90; index++) rows.push([...rows[1]]);
      }
      await route.fulfill({ response, json: payload });
    });
    await page.getByRole('button', { name: 'Change batch', exact: true }).click();
    await page.locator('.batch-list-item').first().click();
    await page.getByRole('button', { name: 'Use this batch', exact: true }).waitFor();
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.locator('.batch-dialog-body').evaluate(element => { element.scrollTop = 0; });
      const table = page.locator('.batch-table-scroll').first();
      assert.equal(await table.evaluate(element => element.scrollHeight <= element.clientHeight + 1), true);
      await table.hover(); await page.mouse.wheel(0, 550);
      await page.waitForFunction(() => globalThis.document.querySelector('.batch-dialog-body').scrollTop > 100);
      assert.equal(await table.evaluate(element => element.scrollTop), 0);
      const box = await page.locator('.batch-dialog-header').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height < viewport.height);
      await page.locator('.batch-dialog-body').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await page.getByRole('button', { name: 'Use this batch', exact: true }).click();
      await page.getByRole('button', { name: 'Change batch', exact: true }).waitFor();
      if (viewport.width === 1280) {
        await page.getByRole('button', { name: 'Change batch', exact: true }).click();
        await page.locator('.batch-list-item').first().click();
        await page.getByRole('button', { name: 'Use this batch', exact: true }).waitFor();
        assert.equal(await page.locator('.batch-dialog-body').evaluate(element => element.scrollTop), 0);
      }
    }
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.getByRole('button', { name: 'Quick logins', exact: true }).click();
    await page.getByLabel('Quick login tokens', { exact: true }).setInputFiles({ name: 'Quick tokens.csv', mimeType: 'text/csv', buffer: Buffer.from('Tokens\nLogin,Portal Password\nUI-A,known-password\n00999-R2,manual-password\n') });
    await page.getByRole('checkbox').first().check(); await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Continue with 2 selected', exact: true }).click();
    await page.getByLabel('Name for 00999-R2', { exact: true }).fill('Manual Test Student');
    assert.equal(await page.locator('.quick-student').first().getByText('Student UI-A', { exact: true }).count(), 1);
    await page.getByLabel('Location', { exact: true }).fill('Quick lab');
    await page.getByLabel('Exam time', { exact: true }).fill('13:30');
    await page.getByRole('button', { name: 'Preview slips', exact: true }).click();
    await page.frameLocator('iframe[title="Quick login slips preview"]').getByText('00999-R2', { exact: true }).waitFor();
    const slip = page.frameLocator('iframe[title="Quick login slips preview"]');
    const institution = slip.getByText('Institution ID', { exact: true }).first();
    assert.equal(await institution.locator('br').count(), 0);
    assert.equal(await institution.evaluate(element => { const range = globalThis.document.createRange(); range.selectNodeContents(element); return range.getClientRects().length; }), 1);
    assert.equal(await slip.locator('.login-credentials').first().evaluate(element => { const outer = element.parentElement; const page = outer.closest('.page'); return outer.getBoundingClientRect().right <= page.getBoundingClientRect().right - 75 && element.scrollWidth <= element.clientWidth + 1; }), true);
    const quickDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download login slips', exact: true }).click();
    const quickFile = await quickDownload; const quickTarget = path.join(folder, 'quick-logins.zip'); await quickFile.saveAs(quickTarget);
    const { default: JSZip } = await import('jszip'); const quickZip = await JSZip.loadAsync(await readFile(quickTarget));
    const pdfs = Object.keys(quickZip.files).filter(name => name.endsWith('.pdf')); assert.equal(pdfs.length, 1);
    const slipPdf = await quickZip.file(pdfs[0]).async('nodebuffer');
    assert.ok(slipPdf.subarray(0, 4).equals(Buffer.from('%PDF')));
    if (process.env.CEPT_BATCH_ARTIFACT_DIR) await writeFile(path.join(process.env.CEPT_BATCH_ARTIFACT_DIR, 'login-spacing.pdf'), slipPdf);
    await page.getByText('Login slips downloaded.', { exact: true }).waitFor();
    assert.equal(await prisma.student.count({ where: { registrationNumber: '00999-R2' } }), 0);
    await page.getByLabel('Location and time settings', { exact: true }).selectOption('individual');
    await page.getByLabel('Location for 00999-R2', { exact: true }).fill('Individual Lab');
    await page.getByLabel('Time for 00999-R2', { exact: true }).fill('15:45');
    await page.frameLocator('iframe[title="Quick login slips preview"]').getByText('Individual Lab', { exact: true }).waitFor();
    await page.frameLocator('iframe[title="Quick login slips preview"]').getByText(/3:45 pm/i).waitFor();

    assert.deepEqual(errors, [], errors.join('\n'));
  } finally { await browser.close(); }
}
