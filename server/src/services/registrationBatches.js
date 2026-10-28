import { cleanName, nameFields } from './studentNames.js';
import { registrationBase, nextRegistrationNumber } from '../utils/nextRegistration.js';
import { validBatchFiles } from '../utils/batchFiles.js';

function fail(message) { const error = new Error(message); error.status = 400; throw error; }
function cell(value, label, max = 20000) {
  if (value === null || value === undefined) return '';
  if (!['string', 'number', 'boolean'].includes(typeof value)) fail(`${label} contains unsupported data.`);
  if (typeof value === 'number' && !Number.isFinite(value)) fail(`${label} contains an invalid number.`);
  if (String(value).length > max) fail(`${label} is too long.`);
  return value;
}
const str = value => String(value ?? '').trim();
const attempt = value => { const match = value.match(/-R(\d+)$/i); return match ? BigInt(match[1]) : 0n; };
export function refineRegistration(raw, family) {
  if (!family.length) return raw;
  const exact = family.find(student => student.registrationNumber === raw && student.score === null);
  if (exact) return exact.registrationNumber;
  const unused = family.filter(student => student.score === null).sort((a, b) => {
    const first = attempt(a.registrationNumber), second = attempt(b.registrationNumber);
    return first > second ? -1 : first < second ? 1 : 0;
  });
  return unused[0]?.registrationNumber || nextRegistrationNumber(registrationBase(raw), family.map(student => student.registrationNumber));
}
export function prepareBatchFiles(input, state) {
  if (!Array.isArray(input) || !input.length || input.length > 500 || Buffer.byteLength(JSON.stringify(input)) > 32 * 1024 * 1024) fail('Choose between 1 and 500 registration files, up to 32 MB.');
  const families = new Map();
  for (const student of state) {
    const base = registrationBase(student.registrationNumber);
    if (!families.has(base)) families.set(base, []);
    families.get(base).push(student);
  }
  const officialNames = new Map();
  for (const file of input) {
    const incomingRows = file?.sheets?.[0]?.rows;
    if (!Array.isArray(incomingRows)) continue;
    for (const row of incomingRows.slice(1)) {
      if (!Array.isArray(row) || !str(row[0]) || !cleanName(row[1])) continue;
      const base = registrationBase(str(row[0]));
      const name = cleanName(row[1]);

      if (!officialNames.has(base) || str(row[0]) === base) officialNames.set(base, name);
    }
  }
  let totalCells = 0;
  const rows = [];
  const files = input.map(file => {
    if (typeof file.fileName !== 'string' || !file.fileName.trim() || file.fileName.length > 255 || !Array.isArray(file.sheets) || !file.sheets.length || file.sheets.length > 100) fail('Invalid registration file.');
    const sheets = file.sheets.map(sheet => {
      if (typeof sheet.name !== 'string' || !sheet.name || sheet.name.length > 100 || !Array.isArray(sheet.rows) || sheet.rows.length > 100001) fail(`Invalid worksheet in ${file.fileName}.`);
      return { name: sheet.name, rows: sheet.rows.map(row => {
        if (!Array.isArray(row) || row.length > 1000) fail(`Invalid row in ${file.fileName}.`);
        totalCells += row.length;
        if (totalCells > 2000000) fail('These registration files contain too much data.');
        return row.map(value => cell(value, file.fileName));
      }) };
    });
    const headers = sheets[0].rows[0] || [];
    const normalized = headers.map(value => str(value).toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (['regnum', 'name', 'email', 'mobile', 'date', 'time'].some((header, index) => normalized[index] !== header)) fail(`Expected RegNum, Name, Email, Mobile, Date, Time in ${file.fileName}.`);
    const students = [];
    for (let rowIndex = 1; rowIndex < sheets[0].rows.length; rowIndex++) {
      const values = sheets[0].rows[rowIndex];
      if (values.every(value => !str(value))) continue;
      const raw = str(values[0]);
      if (!raw || raw.length > 100 || !str(values[1])) fail(`Missing registration number or name on row ${rowIndex + 1} in ${file.fileName}.`);
      const family = families.get(registrationBase(raw)) || [];
      const refined = refineRegistration(raw, family);
      const source = family.find(student => student.registrationNumber === refined) || [...family].sort((a, b) => attempt(a.registrationNumber) > attempt(b.registrationNumber) ? -1 : 1)[0];
      const student = { rowIndex, originalRegistrationNumber: raw, registrationNumber: refined, originalName: str(values[1]), name: officialNames.get(registrationBase(raw)), email: str(values[2]), mobile: str(values[3]), date: str(values[4]), time: str(values[5]) };
      const canonicalName = nameFields(student.name, family.find(row => row.registrationNumber === registrationBase(raw)) || source, true);
      values[1] = student.name;
      let previous = {};
      try { previous = JSON.parse(source?.registrationData || '{}'); } catch { /* Keep the new complete registration snapshot. */ }
      if (!previous || typeof previous !== 'object' || Array.isArray(previous)) previous = {};
      const priorHeaders = Array.isArray(previous.headers) ? previous.headers : [];
      const priorFields = previous.fields && typeof previous.fields === 'object' && !Array.isArray(previous.fields) ? previous.fields : Object.fromEntries(priorHeaders.map((header, index) => [String(header), previous.values?.[index] ?? '']));
      const details = { ...previous, headers, values: [...values], fields: { ...priorFields, ...Object.fromEntries(headers.map((header, index) => [String(header), values[index] ?? ''])) }, fileName: file.fileName, sheetName: sheets[0].name };
      details.values[0] = refined;
      details.fields[String(headers[0])] = refined;
      rows.push({ regNum: refined, sourceId: source?.id, ...canonicalName, email: student.email || source?.email || '', mobile: student.mobile || source?.mobile || '', examDate: student.date, examTime: student.time, idsNotNeeded: source?.idsNotNeeded || false, scoresNotNeeded: source?.scoresNotNeeded || false, registrationData: JSON.stringify(details) });
      values[0] = refined;
      students.push(student);
      if (rows.length > 100000) fail('A batch can contain at most 100,000 students.');
    }
    if (!students.length) fail(`No students were found in ${file.fileName}.`);
    return { fileName: file.fileName, sheets, students };
  });
  const counts = new Map();
  for (const row of rows) { const base = registrationBase(row.regNum); counts.set(base, (counts.get(base) || 0) + 1); }
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([base]) => base);
  for (const file of files) for (const student of file.students) student.duplicateGroup = duplicates.includes(registrationBase(student.registrationNumber)) ? registrationBase(student.registrationNumber) : null;
  if (!duplicates.length && !validBatchFiles(files, rows.length)) fail('Invalid registration files.');
  return { files, rows, duplicates, modifiedCount: files.reduce((count, file) => count + file.students.filter(student => student.originalRegistrationNumber !== student.registrationNumber).length, 0) };
}
export function cairoDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export async function saveBatch(tx, draft, username) {
  const date = cairoDate();
  const previous = await tx.registrationBatch.findFirst({ where: { date }, orderBy: { sequence: 'desc' } });
  const sequence = (previous?.sequence || 0) + 1;
  const label = date.split('-').reverse().join('-');
  return tx.registrationBatch.create({ data: { name: sequence === 1 ? label : `${label} — ${sequence}`, date, sequence, testDate: draft.targetDate, createdBy: username, studentCount: draft.rows.length, fileCount: draft.files.length, files: JSON.stringify(draft.files) } });
}
