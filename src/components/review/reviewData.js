export function registrationReviewFiles(files) {
  return files.map(file => ({ name: file.fileName, count: file.students.length, sheets: file.sheets.map((sheet, index) => {
    const students = new Map((index === 0 ? file.students : []).map(student => [student.rowIndex, student]));
    const width = sheet.rows.reduce((count, row) => Math.max(count, row.length), 1);
    return { name: sheet.name, hasIds: index === 0, columns: Array.from({ length: width }, (_, column) => String(sheet.rows[0]?.[column] ?? '')), rows: sheet.rows.slice(1).map((cells, rowIndex) => {
      const student = students.get(rowIndex + 1);
      const before = student?.originalRegistrationNumber ?? String(cells[0] ?? '');
      const after = student?.registrationNumber ?? String(cells[0] ?? '');
      return { key: rowIndex, sourceRow: rowIndex + 1, duplicateGroup: student?.duplicateGroup, cells: student ? cells.map((value, column) => column === 1 ? student.originalName : value) : cells, before, after, changed: Boolean(student && before !== after) };
    }) };
  }) }));
}
export function scoreReviewFiles(files) {
  return files.map(file => ({ name: file.file.name, count: file.rows.length, sheets: [{ name: file.sheetName, hasIds: true, columns: ['Registration', 'Score', 'Level / value'], rows: file.rows.map(row => ({ key: row.r, before: row.regNumRaw, after: row.strippedRegNum, cells: [row.strippedRegNum, row.score ?? '—', row.value || '—'], changed: row.regNumRaw !== row.strippedRegNum, unmatched: row.matched === false })) }] }));
}
