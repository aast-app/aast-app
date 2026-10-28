import { runtimeStore } from './runtimeStore.js';
import { cleanName, studentName, nameFields, synchronizeStudentNames } from './studentNames.js';
import { registrationBase } from '../utils/nextRegistration.js';
import { prepareBatchFiles, saveBatch } from './registrationBatches.js';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db/connect.js';
import { fingerprint, executeSilentBackup } from './backup.js';

const drafts = runtimeStore('drafts');
const uploads = runtimeStore('uploads');
const LIMIT = 100000;
const TTL = 15 * 60 * 1000;
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function text(value, label, max = 500) {
  if (typeof value !== 'string' && typeof value !== 'number') fail(`${label} must contain text.`);
  const result = String(value).trim();
  if (!result || result.length > max) fail(`${label} is empty or too long.`);
  return result;
}
function optionalText(value, label) { return value === null || value === undefined || value === '' ? null : text(value, label); }
function numeric(value, label) {
  if (value === null || value === undefined || value === '') return null;
  if (!['string', 'number'].includes(typeof value) || !Number.isFinite(Number(value))) fail(`${label} must be a valid number.`);
  return Number(value);
}
function array(rows) { if (!Array.isArray(rows) || !rows.length || rows.length > LIMIT) fail(`Provide between 1 and ${LIMIT} records.`); }
function date(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || (typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value)) fail('Choose a valid test date.'); return value; }
function unique(rows, field) { const seen = new Set(); for (const row of rows) { if (seen.has(row[field])) fail(`Duplicate registration number: ${row[field]}. Remove duplicate rows before saving.`); seen.add(row[field]); } }
async function sessionDraft(req, key) {
  const draft = await drafts.get(key);
  if (!draft || draft.session !== req.sessionKey || draft.expires < Date.now()) fail('This preview expired. Upload the file again.', 409);
  return draft;
}
export async function studentState(db = prisma) { return db.student.findMany({ orderBy: { id: 'asc' } }); }
async function keepDraft(req, kind, rows, state, extra = {}) {
  for (const [key, value] of await drafts.entries()) if (value.session === req.sessionKey && value.kind === kind && !value.result) await drafts.delete(key);
  const draftId = randomUUID();
  await drafts.set(draftId, { kind, rows, baseline: fingerprint(state), session: req.sessionKey, expires: Date.now() + TTL, username: req.user.username, ...extra });
  return draftId;
}
export function validateMasterRows(rows) {
  array(rows);
  const normalized = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!Array.isArray(row)) fail(`Row ${index + 2} is not a spreadsheet row.`);
    if (row.every(value => value === null || value === undefined || String(value).trim() === '')) continue;
    const registrationNumber = text(row[0], `Registration number on row ${index + 2}`, 100);
    const lastName = optionalText(row[1], `Last name on row ${index + 2}`) || '';
    const firstName = optionalText(row[2], `First name on row ${index + 2}`) || '';
    normalized.push({ registrationNumber, lastName, firstName, score: numeric(row[3], `Score on row ${index + 2}`), value: optionalText(row[4], `Value on row ${index + 2}`) });
  }
  array(normalized);
  unique(normalized, 'registrationNumber');
  return normalized;
}
export async function previewMaster(dataRows, fileName, req) {
  const rows = validateMasterRows(dataRows);
  const state = await studentState();
  const existing = new Set(state.map(row => row.registrationNumber));
  const added = rows.filter(row => !existing.has(row.registrationNumber)).length;
  const draftId = await keepDraft(req, 'master', rows, state, { fileName: text(fileName, 'File name', 255) });
  return { success: true, draftId, processedCount: rows.length, summary: { records: rows.length, added, updated: rows.length - added } };
}
export async function stageMasterChunk(body, req) {
  const { dataRows, fileName, chunkIndex, totalRows, isLastChunk } = body;
  if (!Number.isInteger(totalRows) || totalRows < 1 || totalRows > LIMIT || !Number.isInteger(chunkIndex) || chunkIndex < 0 || !Array.isArray(dataRows) || !dataRows.length || dataRows.length > 500 || typeof isLastChunk !== 'boolean') fail('Invalid upload batch. Start the upload again.');
  let uploadId = body.uploadId;
  let upload = uploadId && await uploads.get(uploadId);
  if (!uploadId) {
    if (chunkIndex !== 0) fail('Start with the first batch.');
    for (const [key, value] of await uploads.entries()) if (value.session === req.sessionKey) await uploads.delete(key);
    uploadId = randomUUID();
    upload = { rows: [], next: 0, totalRows, fileName: text(fileName, 'File name', 255), session: req.sessionKey, expires: Date.now() + TTL };
    await uploads.set(uploadId, upload);
  }
  if (!upload || upload.session !== req.sessionKey || upload.expires < Date.now() || upload.next !== chunkIndex || upload.totalRows !== totalRows || upload.fileName !== fileName) fail('An upload batch is missing or out of order. Upload the file again.', 409);
  if (upload.rows.length + dataRows.length > totalRows) fail('The upload contains more rows than expected.');
  upload.bytes = (upload.bytes || 0) + Buffer.byteLength(JSON.stringify(dataRows));
  if (upload.bytes > 32 * 1024 * 1024) { await uploads.delete(uploadId); fail('The upload is too large. Choose a file with less data.'); }
  upload.rows.push(...dataRows);
  upload.next++;
  upload.expires = Date.now() + TTL;
  await uploads.set(uploadId, upload);
  if (!isLastChunk) return { success: true, uploadId, stagedRows: upload.rows.length };
  await uploads.delete(uploadId);
  if (upload.rows.length !== totalRows) fail('The upload is incomplete. No records were saved.');
  return previewMaster(upload.rows, upload.fileName, req);
}
export async function previewIds({ targetDate, files }, req) {
  date(targetDate);
  const state = await studentState();
  const prepared = prepareBatchFiles(files, state);
  const draftId = prepared.duplicates.length ? null : await keepDraft(req, 'ids', prepared.rows, state, { targetDate, numFiles: prepared.files.length, files: prepared.files });
  return { success: true, draftId, duplicates: prepared.duplicates, processedCount: prepared.rows.length, modifiedCount: prepared.modifiedCount, files: prepared.files };
}
export async function previewScores({ targetDate, scores, numFiles = 1 }, req) {
  date(targetDate); array(scores);
  if (!Number.isInteger(numFiles) || numFiles < 1 || numFiles > 500) fail('Invalid number of files.');
  const input = scores.map((row, index) => ({ registrationNumber: text(row?.rawRegNum, `Registration number on row ${index + 2}`, 100), score: numeric(row.score, `Score on row ${index + 2}`), value: optionalText(row.value, `Value on row ${index + 2}`) }));
  unique(input, 'registrationNumber');
  const state = await studentState();
  const students = new Map(state.map(student => [student.registrationNumber, student]));
  const rows = [];
  const unmatchedNumbers = [];
  for (const score of input) {
    const target = students.get(score.registrationNumber);
    if (!target) { unmatchedNumbers.push(score.registrationNumber); continue; }
    rows.push({ id: target.id, score: score.score !== null ? score.score : target.score, value: score.value !== null ? score.value : target.value });
  }
  const unmatchedCount = unmatchedNumbers.length;
  if (!rows.length) fail('No matching students were found. No scores were saved.');
  const draftId = await keepDraft(req, 'scores', rows, state, { targetDate, numFiles, unmatchedCount });
  return { success: true, draftId, matchedCount: rows.length, unmatchedCount, unmatchedNumbers };
}
async function recordDaily(tx, draft) {
  const { targetDate, numFiles, username, kind } = draft;
  const flag = kind === 'ids' ? 'idsUploaded' : 'scoresUploaded';
  await tx.dailyOperation.upsert({ where: { date: targetDate }, update: { [flag]: true }, create: { date: targetDate, [flag]: true } });
  const activityDate = new Date().toLocaleDateString('en-CA');
  const metadata = await tx.dailyMetaData.upsert({ where: { activityDate }, update: {}, create: { activityDate } });
  let records;
  try { records = JSON.parse(metadata.ceptData); } catch { throw new Error('Daily metadata is damaged. No import was saved.'); }
  if (!Array.isArray(records)) throw new Error('Daily metadata is invalid. No import was saved.');
  let record = records.find(row => row.intendedTestDate === targetDate);
  if (!record) { record = { intendedTestDate: targetDate, maxIdFiles: 0, maxScoreFiles: 0, contributors: [] }; records.push(record); }
  const field = kind === 'ids' ? 'maxIdFiles' : 'maxScoreFiles';
  record[field] = Math.max(record[field] || 0, numFiles);
  if (!record.contributors.includes(username)) record.contributors.push(username);
  await tx.dailyMetaData.update({ where: { activityDate }, data: { ceptData: JSON.stringify(records) } });
}
export async function commitImport({ draftId }, req) {
  const draft = await sessionDraft(req, draftId);
  if (draft.kind === 'master' && req.user.role !== 'admin') fail('Administrator access is required.', 403);
  if (draft.result) return draft.result; // A lost response can be retried without applying twice.
  if (fingerprint(await studentState()) !== draft.baseline) fail('Student records changed since the preview. Upload again before saving.', 409);
  try { await executeSilentBackup(req.user.username); } catch { fail('A safety backup could not be created. No records were saved. Check the backup folder and retry.', 503); }
  const result = await prisma.$transaction(async tx => {
    const state = await studentState(tx);
    const currentStudents = new Map(state.map(student => [student.registrationNumber, student]));
    if (fingerprint(state) !== draft.baseline) fail('Student records changed since the preview. Upload again before saving.', 409);
    for (const row of draft.rows) {
      if (draft.kind === 'master') {
        const existing = currentStudents.get(row.registrationNumber);
        const temporary = nameFields(cleanName(`${row.firstName} ${row.lastName}`), row, false);
        const update = { score: row.score, value: row.value };
        if (existing && !existing.nameVerified && !studentName(existing)) Object.assign(update, temporary);
        await tx.student.upsert({ where: { registrationNumber: row.registrationNumber }, update, create: { ...row, ...temporary } });
      }
      if (draft.kind === 'ids') {
        const { regNum, sourceId: _sourceId, ...details } = row;
        await tx.student.upsert({ where: { registrationNumber: regNum }, update: details, create: { registrationNumber: regNum, ...details, score: null, value: null } });
      }
      if (draft.kind === 'scores') { const { id, ...data } = row; await tx.student.update({ where: { id }, data }); }
    }
    const officialNames = draft.kind === 'ids' ? new Map(draft.rows.map(row => [registrationBase(row.regNum), row.name])) : new Map();
    await synchronizeStudentNames(tx, officialNames);
    const batch = draft.kind === 'ids' ? await saveBatch(tx, draft, req.user.username) : null;
    if (draft.kind === 'master') {
      await tx.uploadHistory.create({ data: { username: req.user.username, action: 'Uploaded Master Data', fileName: draft.fileName, recordsUpdated: draft.rows.length } });
    } else { await recordDaily(tx, { ...draft, username: req.user.username }); }
    await tx.log.create({ data: { username: req.user.username, action: draft.kind === 'master' ? 'Uploaded Master Data' : draft.kind === 'ids' ? 'Process CEPT Registration Numbers' : 'Process Clean Scores', details: `Saved ${draft.rows.length} records${draft.targetDate ? ` for ${draft.targetDate}` : ''}.`, metadata: JSON.stringify({ targetDate: draft.targetDate, processedFiles: draft.numFiles, records: draft.rows.length }) } });
    const receipt = { success: true, processedCount: draft.rows.length, batch: batch ? { id: batch.id, name: batch.name } : undefined, message: batch ? `Batch ${batch.name} saved.` : 'Records saved successfully.' };
    await drafts.set(draftId, { ...draft, result: receipt }, tx);
    return receipt;
  }, { timeout: 120000, maxWait: 10000 });
  draft.result = result;
  return result;
}
export async function discardImport({ draftId }, req) { const draft = await drafts.get(draftId); if (draft?.session === req.sessionKey) await drafts.delete(draftId); return { success: true }; }
