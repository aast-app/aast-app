import { registrationBase } from '../utils/nextRegistration.js';

export const cleanName = value => String(value ?? '').normalize('NFC').replace(/\s+/gu, ' ').trim();
const sameName = (a, b) => cleanName(a).toLocaleLowerCase() === cleanName(b).toLocaleLowerCase();
export const studentName = row => cleanName(row.name) || cleanName(`${row.firstName || ''} ${row.lastName || ''}`);

// Keep a known first/last boundary only when it agrees with the full name.
// Otherwise retain the official full name intact in the legacy lastName column.
export function nameFields(fullName, source = {}, verified = false) {
  const name = cleanName(fullName);
  const parts = cleanName(`${source.firstName || ''} ${source.lastName || ''}`);
  let firstName = '', lastName = name;
  if (parts && sameName(parts, name)) {
    const words = name.split(' ');
    const firstCount = cleanName(source.firstName) ? cleanName(source.firstName).split(' ').length : 0;
    firstName = words.slice(0, firstCount).join(' ');
    lastName = words.slice(firstCount).join(' ');
  }
  return { name, firstName, lastName, nameVerified: Boolean(verified) };
}
export function groupFamilies(students) {
  const groups = new Map();
  for (const student of students) {
    const base = registrationBase(student.registrationNumber);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(student);
  }
  return groups;
}
export function canonicalFamilyNames(students, officialNames = new Map()) {
  const result = new Map();
  for (const [base, family] of groupFamilies(students)) {
    const original = family.find(row => row.registrationNumber === base);
    const confirmed = family.filter(row => row.nameVerified && studentName(row)).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) || b.id - a.id);
    const source = (original?.nameVerified && studentName(original) ? original : confirmed[0]) || (original && studentName(original) ? original : family.find(row => studentName(row)));
    const official = officialNames.get(base);
    const name = official || (source && studentName(source));
    if (name) result.set(base, nameFields(name, original || source, Boolean(official || source?.nameVerified)));
  }
  return result;
}
export function namePatches(students, officialNames = new Map()) {
  const canonical = canonicalFamilyNames(students, officialNames);
  const groups = new Map();
  for (const student of students) {
    const base = registrationBase(student.registrationNumber);
    const data = canonical.get(base);
    if (!data || Object.entries(data).every(([key, value]) => student[key] === value)) continue;
    if (!groups.has(base)) groups.set(base, { ids: [], data });
    groups.get(base).ids.push(student.id);
  }
  return [...groups.values()];
}
export async function synchronizeStudentNames(db, officialNames = new Map()) {
  const students = await db.student.findMany({ orderBy: { id: 'asc' } });
  for (const { ids, data } of namePatches(students, officialNames)) {
    for (let offset = 0; offset < ids.length; offset += 400) await db.student.updateMany({ where: { id: { in: ids.slice(offset, offset + 400) } }, data });
  }
}
// Only saved ID-check batches prove an existing name came from an official file.
// Conflicting names within one historical batch are not silently marked confirmed.
export function namesFromSavedBatches(batches) {
  const result = new Map();
  for (const batch of [...batches].sort((a, b) => a.id - b.id)) {
    let files;
    try { files = typeof batch.files === 'string' ? JSON.parse(batch.files) : batch.files; } catch { continue; }
    if (!Array.isArray(files)) continue;
    const names = new Map(), conflicts = new Set();
    for (const file of files) for (const student of (Array.isArray(file?.students) ? file.students : [])) {
      if (typeof student?.registrationNumber !== 'string' || !cleanName(student.name)) continue;
      const base = registrationBase(student.registrationNumber);
      const name = cleanName(student.name);
      if (names.has(base) && !sameName(names.get(base), name)) conflicts.add(base);
      names.set(base, name);
    }
    for (const base of conflicts) result.delete(base);
    for (const [base, name] of names) if (!conflicts.has(base)) result.set(base, name);
  }
  return result;
}
export function applyNamePatches(students, officialNames = new Map()) {
  const names = canonicalFamilyNames(students, officialNames);
  return students.map(student => ({ ...student, ...names.get(registrationBase(student.registrationNumber)) }));
}
