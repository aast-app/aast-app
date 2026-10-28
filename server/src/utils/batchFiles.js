// Saved batches retain file/sheet separation, displayed cell values and row order.
export function validBatchFiles(files, expectedCount) {
  if (!Array.isArray(files) || !files.length || files.length > 500) return false;
  let count = 0;
  const ids = new Set();
  for (const file of files) {
    if (typeof file.fileName !== 'string' || !Array.isArray(file.sheets) || !file.sheets.length || !Array.isArray(file.students)) return false;
    for (const sheet of file.sheets) {
      if (typeof sheet.name !== 'string' || !Array.isArray(sheet.rows) || sheet.rows.some(row => !Array.isArray(row) || row.some(value => value !== null && !['string', 'number', 'boolean'].includes(typeof value)))) return false;
    }
    for (const student of file.students) {
      if (!Number.isSafeInteger(student.rowIndex) || student.rowIndex < 1 || typeof student.registrationNumber !== 'string' || !student.registrationNumber || typeof student.originalRegistrationNumber !== 'string') return false;
      if (file.sheets[0].rows[student.rowIndex]?.[0] !== student.registrationNumber || ids.has(student.registrationNumber)) return false;
      ids.add(student.registrationNumber); count++;
    }
  }
  return count === expectedCount;
}
