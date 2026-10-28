import { runtimeStore, cloudDatabase } from './runtimeStore.js';
import { applyNamePatches, namesFromSavedBatches } from './studentNames.js';
import { validBatchFiles } from '../utils/batchFiles.js';
import { prisma } from '../db/connect.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { clearSessions } from '../middlewares/session.js';

const models = ['user', 'student', 'log', 'dailyOperation', 'dailyMetaData', 'uploadHistory', 'registrationBatch'];
const previews = runtimeStore('restores');
const root = () => process.env.BACKUP_DIR || fileURLToPath(new URL('../../backups/', import.meta.url));
const fail = message => { const error = new Error(message); error.status = 400; throw error; };
export const fingerprint = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
export async function snapshot(db) {
  const collections = {};
  for (const model of models) collections[model] = await db[model].findMany({ orderBy: { id: 'asc' } });
  return collections;
}
export async function buildBackup(triggerSource) {
  const collections = await prisma.$transaction(tx => snapshot(tx), { timeout: 60000 });
  return { format: 'cept-full-backup', version: 3, exportedBy: triggerSource, exportDate: new Date().toISOString(), collections };
}
async function serverKey(create = true) {
  if (cloudDatabase()) { const value = process.env.BACKUP_ENCRYPTION_KEY; if (!/^[a-f0-9]{64}$/i.test(value || '')) fail('The hosted backup encryption key is not configured.'); return Buffer.from(value, 'hex'); }
  await fs.mkdir(root(), { recursive: true });
  const filename = path.join(root(), '.backup-key');
  try { const key = await fs.readFile(filename); if (key.length !== 32) fail('The server backup key is damaged.'); return key; }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (!create) fail('The original server backup key is missing. Restore it alongside the server backups.');
    const key = randomBytes(32);
    try { await fs.writeFile(filename, key, { flag: 'wx', mode: 0o600 }); return key; }
    catch (error) { if (error.code === 'EEXIST') return fs.readFile(filename); throw error; }
  }
}
function passwordKey(passphrase, salt) {
  if (typeof passphrase !== 'string' || passphrase.length < 12 || passphrase.length > 256) fail('Use a backup passphrase of 12–256 characters.');
  return scryptSync(passphrase, salt, 32);
}
export async function encryptBackup(backup, passphrase) {
  const salt = randomBytes(16);
  const key = passphrase === undefined ? await serverKey() : passwordKey(passphrase, salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(backup);
  if (Buffer.byteLength(plaintext) > 32 * 1024 * 1024) fail('This backup exceeds the current 32 MB recovery limit. Increase the backup and upload limits together before continuing.');
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { format: 'cept-encrypted-backup', version: 1, keyMode: passphrase === undefined ? 'server' : 'passphrase', salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}
async function decryptBackup(envelope, passphrase) {
  if (!envelope || envelope.format !== 'cept-encrypted-backup' || envelope.version !== 1 || !['server', 'passphrase'].includes(envelope.keyMode)) fail('This is not a supported complete CEPT backup. Old audit exports cannot be restored.');
  for (const field of ['salt', 'iv', 'tag', 'data']) if (typeof envelope[field] !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(envelope[field])) fail('The backup file is damaged.');
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || envelope.data.length > 60 * 1024 * 1024) fail('The backup file is invalid or too large.');
  const key = envelope.keyMode === 'server' ? await serverKey(false) : passwordKey(passphrase, salt);
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8'));
  } catch { fail('The passphrase is incorrect, the server backup key is missing, or the backup file is damaged.'); }
}
const fields = {
  user: { id: 'id', username: 'text', password: '?text', role: 'text', email: '?text', avatarUrl: '?text', isDeleted: 'boolean', createdAt: 'date' },
  student: { id: 'id', registrationNumber: 'text', lastName: 'text', firstName: 'text', name: 'text', nameVerified: 'boolean', email: 'text', mobile: 'text', examDate: 'text', examTime: 'text', registrationData: 'json', score: '?number', value: '?text', idsNotNeeded: 'boolean', scoresNotNeeded: 'boolean', createdAt: 'date', updatedAt: 'date' },
  log: { id: 'id', username: 'text', action: 'text', details: 'text', metadata: 'json', timestamp: 'date' },
  dailyOperation: { id: 'id', date: 'day', idsUploaded: 'boolean', scoresUploaded: 'boolean', idsNotNeeded: 'boolean', scoresNotNeeded: 'boolean' },
  dailyMetaData: { id: 'id', activityDate: 'day', ceptData: 'json', ceptCreate: 'json' },
  registrationBatch: { id: 'id', name: 'text', date: 'day', sequence: 'id', testDate: 'day', createdBy: 'text', createdAt: 'date', studentCount: 'integer', fileCount: 'integer', files: 'json' },
  uploadHistory: { id: 'id', username: 'text', action: 'text', fileName: 'text', recordsUpdated: 'integer', timestamp: 'date' },
};
function validateBackup(backup) {
  if (backup?.format === 'cept-full-backup' && backup.version === 1 && backup.collections && Object.keys(backup.collections).sort().join() === models.filter(model => model !== 'registrationBatch').sort().join() && Array.isArray(backup.collections.student)) {
    backup.collections.student = backup.collections.student.map(student => ({ name: '', email: '', mobile: '', examDate: '', examTime: '', registrationData: '{}', ...student }));
    backup.collections.registrationBatch = [];
    backup.version = 2;
  }
  if (backup?.format === 'cept-full-backup' && backup.version === 2 && Array.isArray(backup.collections?.student)) {
    backup.collections.student = backup.collections.student.map(student => ({ ...student, nameVerified: false }));
    backup.collections.student = applyNamePatches(backup.collections.student, namesFromSavedBatches(backup.collections.registrationBatch || []));
    backup.version = 3;
  }
  if (!backup || backup.format !== 'cept-full-backup' || backup.version !== 3 || !backup.collections || Object.keys(backup.collections).sort().join() !== [...models].sort().join()) fail('The backup does not contain all required data.');
  if (typeof backup.exportDate !== 'string' || Number.isNaN(Date.parse(backup.exportDate)) || typeof backup.exportedBy !== 'string') fail('The backup description is invalid.');
  for (const model of models) {
    const rows = backup.collections[model];
    if (!Array.isArray(rows) || rows.length > 500000) fail(`Invalid ${model} records.`);
    const ids = new Set();
    for (const row of rows) {
      if (!row || Object.keys(row).sort().join() !== Object.keys(fields[model]).sort().join()) fail(`Invalid fields in ${model}.`);
      for (const [field, spec] of Object.entries(fields[model])) {
        const value = row[field];
        if (spec.startsWith('?') && value === null) continue;
        const kind = spec.replace('?', '');
        let valid = false;
        if (kind === 'text' || kind === 'json') valid = typeof value === 'string';
        if (kind === 'date') valid = typeof value === 'string' && !Number.isNaN(Date.parse(value));
        if (kind === 'day') valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
        if (kind === 'boolean') valid = typeof value === 'boolean';
        if (kind === 'number') valid = typeof value === 'number' && Number.isFinite(value);
        if (kind === 'id') valid = Number.isSafeInteger(value) && value > 0;
        if (kind === 'integer') valid = Number.isSafeInteger(value) && value >= 0;
        if (!valid) fail(`Invalid ${model}.${field}.`);
        if (kind === 'json') { try { JSON.parse(value); } catch { fail(`Invalid ${model}.${field}.`); } }
      }
      if (ids.has(row.id)) fail(`Duplicate ${model} record.`);
      ids.add(row.id);
    }
  }
  for (const [model, field] of [['user', 'username'], ['student', 'registrationNumber'], ['dailyOperation', 'date'], ['dailyMetaData', 'activityDate'], ['registrationBatch', 'name']]) {
    const values = backup.collections[model].map(row => row[field]);
    if (values.some(value => !value.trim()) || new Set(values).size !== values.length) fail(`Duplicate or empty ${model}.${field}.`);
  }
  const batchKeys = new Set();
  for (const batch of backup.collections.registrationBatch) {
    const files = JSON.parse(batch.files);
    const key = `${batch.date}/${batch.sequence}`;
    if (!validBatchFiles(files, batch.studentCount) || files.length !== batch.fileCount || batchKeys.has(key)) fail('Invalid saved registration batch.');
    batchKeys.add(key);
  }
  backup.collections.student = applyNamePatches(backup.collections.student);
  if (!backup.collections.user.some(user => user.role === 'admin' && !user.isDeleted)) fail('The backup must contain an active administrator.');
  return backup;
}
export async function executeSilentBackup(triggerSource = 'System', safety = false) {
  const backup = await buildBackup(triggerSource);
  const envelope = await encryptBackup(backup);
  const fileName = `${safety ? 'before_restore' : 'backup'}_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID()}.json`;
  if (cloudDatabase()) {
    const payload = JSON.stringify(envelope);
    await prisma.serverBackup.create({ data: { fileName, payload, bytes: Buffer.byteLength(payload), safety } });
    const old = await prisma.serverBackup.findMany({ where: { safety: false }, orderBy: { createdAt: 'desc' }, skip: 20, select: { fileName: true } });
    if (old.length) await prisma.serverBackup.deleteMany({ where: { fileName: { in: old.map(row => row.fileName) } } });
    return { success: true, fileName, message: 'Complete encrypted backup saved in the database.' };
  }
  await fs.writeFile(path.join(root(), fileName), JSON.stringify(envelope), { flag: 'wx', mode: 0o600 });
  // Safety snapshots are never removed by normal rotation.
  const previous = (await fs.readdir(root())).filter(name => /^backup_.*\.json$/.test(name)).sort().reverse();
  await Promise.all(previous.slice(20).map(name => fs.rm(path.join(root(), name), { force: true })));
  return { success: true, fileName, message: 'Complete encrypted backup saved on the server.' };
}
export async function listBackups() {
  if (cloudDatabase()) return prisma.serverBackup.findMany({ orderBy: { createdAt: 'desc' }, select: { fileName: true, bytes: true } });
  try {
    const names = (await fs.readdir(root())).filter(name => /^(backup|before_restore)_[\w.-]+\.json$/.test(name)).sort().reverse();
    return Promise.all(names.map(async fileName => ({ fileName, bytes: (await fs.stat(path.join(root(), fileName))).size })));
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export async function previewRestore({ backup, passphrase, fileName }, req) {
  if (fileName) {
    if (!(await listBackups()).some(file => file.fileName === fileName)) fail('Select an existing server backup.');
    backup = JSON.parse(cloudDatabase() ? (await prisma.serverBackup.findUnique({ where: { fileName } })).payload : await fs.readFile(path.join(root(), fileName), 'utf8'));
  }
  const decoded = validateBackup(await decryptBackup(backup, passphrase));
  if (!decoded.collections.user.some(user => user.id === req.user.id && user.username === req.user.username && user.role === 'admin' && !user.isDeleted)) fail('This backup does not contain your active administrator account. Recovery would lock you out.');
  const current = await prisma.$transaction(tx => snapshot(tx), { timeout: 60000 });
  for (const [key, preview] of await previews.entries()) if (preview.session === req.sessionKey) await previews.delete(key);
  const token = randomUUID();
  await previews.set(token, { backup: decoded, baseline: fingerprint(current), session: req.sessionKey, expires: Date.now() + 10 * 60 * 1000 });
  return { success: true, restoreToken: token, exportDate: decoded.exportDate, counts: Object.fromEntries(models.map(model => [model, decoded.collections[model].length])), currentCounts: Object.fromEntries(models.map(model => [model, current[model].length])) };
}
export async function restoreBackup({ restoreToken, confirmation }, req) {
  const preview = await previews.get(restoreToken);
  if (!preview || preview.session !== req.sessionKey || preview.expires < Date.now() || confirmation !== 'RESTORE') fail('Preview the backup first, then type RESTORE to confirm.');
  // The write gate prevents any new authenticated writer from passing during recovery.
  const safety = await executeSilentBackup(req.user.username, true);
  await prisma.$transaction(async tx => {
    if (fingerprint(await snapshot(tx)) !== preview.baseline) { const error = new Error('Data changed since the preview. Review the backup again before restoring.'); error.status = 409; throw error; }
    for (const model of [...models].reverse()) await tx[model].deleteMany();
    for (const model of models) for (const row of preview.backup.collections[model]) await tx[model].create({ data: row });
    if (cloudDatabase()) for (const model of models) { const table = { user: 'User', student: 'Student', log: 'Log', dailyOperation: 'DailyOperation', dailyMetaData: 'DailyMetaData', uploadHistory: 'UploadHistory', registrationBatch: 'RegistrationBatch' }[model]; await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), EXISTS(SELECT 1 FROM "${table}"))`); }
    await tx.log.create({ data: { username: req.user.username, action: 'Restore Backup', details: `Restored complete backup from ${preview.backup.exportDate}. Safety copy: ${safety.fileName}` } });
  }, { timeout: 120000, maxWait: 10000 });
  await previews.clear();
  await clearSessions();
  return { success: true, safetyFileName: safety.fileName, message: 'Recovery completed. Please sign in again.' };
}
